import { ParsedDiffFile, DiffHunk, DiffLine } from '../types';

// Filenames matching these patterns are treated as generated/vendor and skipped
const GENERATED_FILE_PATTERNS = [
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.min\.(js|css)$/,
  /\.map$/,
  /dist\//,
  /build\//,
  /\.pb\.go$/,    // protobuf generated
  /\.generated\./,
];

function isGeneratedFile(filename: string): boolean {
  return GENERATED_FILE_PATTERNS.some((pattern) => pattern.test(filename));
}

/**
 * Parses a unified diff string into structured file/hunk/line data.
 *
 * Handles:
 * - Normal file modifications
 * - New files (--- /dev/null)
 * - Deleted files (+++ /dev/null)
 * - Binary file diffs
 * - Renamed files
 * - Generated/vendor files (flagged but still parsed)
 */
export function parseDiff(diffText: string): ParsedDiffFile[] {
  if (!diffText || diffText.trim() === '') {
    return [];
  }

  const files: ParsedDiffFile[] = [];
  // Split on "diff --git" boundaries
  const fileSections = diffText.split(/^(?=diff --git )/m).filter(Boolean);

  for (const section of fileSections) {
    const file = parseFileSection(section);
    if (file) {
      files.push(file);
    }
  }

  return files;
}

function parseFileSection(section: string): ParsedDiffFile | null {
  const lines = section.split('\n');

  // Extract filename from the diff --git header
  const gitHeader = lines[0].match(/^diff --git a\/(.+) b\/(.+)$/);
  if (!gitHeader) return null;

  const filename = gitHeader[2]; // Use the "b/" (new) filename

  // Detect binary files
  const isBinary = lines.some((l) => /^Binary files? /.test(l));

  // Detect renames
  let status: ParsedDiffFile['status'] = 'modified';
  if (lines.some((l) => l.startsWith('new file mode'))) status = 'added';
  if (lines.some((l) => l.startsWith('deleted file mode'))) status = 'deleted';
  if (lines.some((l) => l.startsWith('rename'))) status = 'renamed';
  if (isBinary) status = 'binary';

  const isGenerated = isGeneratedFile(filename);

  if (isBinary) {
    return {
      filename,
      status: 'binary',
      additions: 0,
      deletions: 0,
      hunks: [],
      isBinary: true,
      isGenerated,
    };
  }

  // Find where the hunks start (after the --- / +++ headers)
  const hunkStartIndex = lines.findIndex((l) => l.startsWith('@@'));
  if (hunkStartIndex === -1) {
    // No hunks — rename or mode-only change
    return {
      filename,
      status,
      additions: 0,
      deletions: 0,
      hunks: [],
      isBinary: false,
      isGenerated,
    };
  }

  const hunkText = lines.slice(hunkStartIndex).join('\n');
  const hunks = parseHunks(hunkText);

  const additions = hunks.flatMap((h) => h.lines).filter((l) => l.type === '+').length;
  const deletions = hunks.flatMap((h) => h.lines).filter((l) => l.type === '-').length;

  return {
    filename,
    status,
    additions,
    deletions,
    hunks,
    isBinary: false,
    isGenerated,
  };
}

function parseHunks(hunkText: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  // Split on @@ headers but keep the header with its hunk
  const hunkSections = hunkText.split(/^(?=@@)/m).filter(Boolean);

  let globalDiffPosition = 0; // position counter across all hunks in a file

  for (const section of hunkSections) {
    const sectionLines = section.split('\n');
    const header = sectionLines[0];

    // Parse @@ -oldStart,oldCount +newStart,newCount @@ context
    const hunkHeader = header.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (!hunkHeader) continue;

    const newFileStart = parseInt(hunkHeader[2], 10);

    const diffLines: DiffLine[] = [];
    let newLineNumber = newFileStart;
    let oldLineNumber = parseInt(hunkHeader[1], 10);
    let hunkDiffPosition = 0; // position within THIS hunk (1-indexed from hunk start)

    for (const line of sectionLines.slice(1)) {
      if (line === '' && hunkDiffPosition === 0) continue; // Skip blank before first line

      if (line.startsWith('+')) {
        hunkDiffPosition++;
        globalDiffPosition++;
        diffLines.push({
          type: '+',
          content: line.slice(1),
          newLineNumber: newLineNumber++,
          diffPosition: hunkDiffPosition,
        });
      } else if (line.startsWith('-')) {
        hunkDiffPosition++;
        globalDiffPosition++;
        diffLines.push({
          type: '-',
          content: line.slice(1),
          oldLineNumber: oldLineNumber++,
          diffPosition: hunkDiffPosition,
        });
      } else if (line.startsWith(' ')) {
        hunkDiffPosition++;
        globalDiffPosition++;
        diffLines.push({
          type: ' ',
          content: line.slice(1),
          newLineNumber: newLineNumber++,
          oldLineNumber: oldLineNumber++,
          diffPosition: hunkDiffPosition,
        });
      }
      // Lines starting with '\' (e.g. "\ No newline at end of file") are skipped
    }

    if (diffLines.length > 0) {
      hunks.push({
        header,
        newFileStart,
        lines: diffLines,
      });
    }
  }

  return hunks;
}

/**
 * Builds a map from {filename -> lineNumber} -> diffPosition
 * Used when posting GitHub review comments (API requires diffPosition, not line number).
 */
export function buildLinePositionMap(
  files: ParsedDiffFile[],
): Map<string, number> {
  const map = new Map<string, number>();

  for (const file of files) {
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.newLineNumber !== undefined) {
          map.set(`${file.filename}:${line.newLineNumber}`, line.diffPosition);
        }
      }
    }
  }

  return map;
}
