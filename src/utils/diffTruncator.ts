import { ParsedDiffFile } from '../types';
import { logger } from './logger';

// Default max characters to send to LLM. ~80k chars ≈ ~20k tokens (safe for gemini-2.0-flash's 1M context)
const DEFAULT_MAX_CHARS = parseInt(process.env.MAX_DIFF_CHARS || '80000', 10);

export interface TruncationResult {
  diff: string;
  truncated: boolean;
  includedFiles: string[];
  omittedFiles: string[];
}

/**
 * Truncates a diff (as a string) if it exceeds MAX_DIFF_CHARS.
 *
 * Strategy:
 * 1. Parse into per-file sections
 * 2. Sort files by change size (largest changes first — most important to review)
 * 3. Include files until the char budget is exceeded
 * 4. Append a truncation notice listing omitted files
 *
 * This is better than naive string truncation because it keeps whole files
 * intact and maintains valid diff structure.
 */
export function truncateDiff(
  rawDiff: string,
  maxChars: number = DEFAULT_MAX_CHARS,
): TruncationResult {
  if (rawDiff.length <= maxChars) {
    // Count files for metadata even when not truncating
    const fileSections = splitIntoFileSections(rawDiff);
    return {
      diff: rawDiff,
      truncated: false,
      includedFiles: fileSections.map((s) => s.filename),
      omittedFiles: [],
    };
  }

  logger.info(`[truncator] Diff is ${rawDiff.length} chars (limit: ${maxChars}). Truncating.`);

  const fileSections = splitIntoFileSections(rawDiff);

  // Sort by number of changed lines descending (most changes = most important to review)
  fileSections.sort((a, b) => b.changedLines - a.changedLines);

  const includedSections: FileDiffSection[] = [];
  const omittedFiles: string[] = [];
  let charCount = 0;

  for (const section of fileSections) {
    if (charCount + section.content.length <= maxChars) {
      includedSections.push(section);
      charCount += section.content.length;
    } else {
      omittedFiles.push(section.filename);
    }
  }

  // Sort back to original order for coherent diff output
  includedSections.sort((a, b) => a.originalIndex - b.originalIndex);

  const truncationNotice =
    omittedFiles.length > 0
      ? `\n\n# [TRUNCATED: ${omittedFiles.length} file(s) omitted due to size limit]\n` +
        `# Omitted files: ${omittedFiles.join(', ')}\n`
      : '';

  return {
    diff: includedSections.map((s) => s.content).join('') + truncationNotice,
    truncated: omittedFiles.length > 0,
    includedFiles: includedSections.map((s) => s.filename),
    omittedFiles,
  };
}

interface FileDiffSection {
  filename: string;
  content: string;
  changedLines: number;
  originalIndex: number;
}

function splitIntoFileSections(diff: string): FileDiffSection[] {
  const sections: FileDiffSection[] = [];
  const parts = diff.split(/^(?=diff --git )/m).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const content = parts[i];
    const filenameMatch = content.match(/^diff --git a\/.+ b\/(.+)$/m);
    const filename = filenameMatch ? filenameMatch[1] : `unknown-file-${i}`;
    const changedLines = (content.match(/^[+-]/gm) || []).length;

    sections.push({ filename, content, changedLines, originalIndex: i });
  }

  return sections;
}

/**
 * Builds a readable diff string from ParsedDiffFile objects.
 * Useful for re-serializing after filtering binary/generated files.
 */
export function filterAndSerializeDiff(files: ParsedDiffFile[], rawDiff: string): string {
  const includedFiles = files
    .filter((f) => !f.isBinary && !f.isGenerated)
    .map((f) => f.filename);

  if (includedFiles.length === 0) return '';

  const sections = splitIntoFileSections(rawDiff);
  return sections
    .filter((s) => includedFiles.includes(s.filename))
    .map((s) => s.content)
    .join('');
}
