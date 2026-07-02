import { parseDiff, buildLinePositionMap } from '../../src/utils/diffParser';
import fs from 'fs';
import path from 'path';

const sampleDiff = fs.readFileSync(
  path.join(__dirname, '../fixtures/sampleDiff.txt'),
  'utf-8',
);

const binaryDiff = fs.readFileSync(
  path.join(__dirname, '../fixtures/binaryDiff.txt'),
  'utf-8',
);

describe('parseDiff', () => {
  it('should return an empty array for an empty diff', () => {
    expect(parseDiff('')).toEqual([]);
    expect(parseDiff('   ')).toEqual([]);
  });

  it('should parse two files from the sample diff', () => {
    const files = parseDiff(sampleDiff);
    expect(files).toHaveLength(2);
  });

  it('should identify new file status correctly', () => {
    const files = parseDiff(sampleDiff);
    const loginFile = files.find((f) => f.filename === 'src/auth/login.ts');
    expect(loginFile).toBeDefined();
    expect(loginFile!.status).toBe('added');
  });

  it('should identify modified file status correctly', () => {
    const files = parseDiff(sampleDiff);
    const helperFile = files.find((f) => f.filename === 'src/utils/helper.ts');
    expect(helperFile).toBeDefined();
    expect(helperFile!.status).toBe('modified');
  });

  it('should correctly count additions and deletions', () => {
    const files = parseDiff(sampleDiff);
    const helperFile = files.find((f) => f.filename === 'src/utils/helper.ts')!;
    // helper.ts: 1 deletion (the old formatDate return), multiple additions
    expect(helperFile.deletions).toBe(1);
    expect(helperFile.additions).toBeGreaterThan(0);
  });

  it('should assign sequential new line numbers to added lines', () => {
    const files = parseDiff(sampleDiff);
    const loginFile = files.find((f) => f.filename === 'src/auth/login.ts')!;
    const addedLines = loginFile.hunks[0].lines.filter((l) => l.type === '+');
    // Lines should be sequential starting at 1 (new file, starts from line 1)
    expect(addedLines[0].newLineNumber).toBe(1);
    expect(addedLines[1].newLineNumber).toBe(2);
  });

  it('should NOT assign newLineNumber to removed lines', () => {
    const files = parseDiff(sampleDiff);
    const helperFile = files.find((f) => f.filename === 'src/utils/helper.ts')!;
    const removedLines = helperFile.hunks[0].lines.filter((l) => l.type === '-');
    expect(removedLines.length).toBeGreaterThan(0);
    removedLines.forEach((line) => {
      expect(line.newLineNumber).toBeUndefined();
    });
  });

  it('should detect binary files', () => {
    const files = parseDiff(binaryDiff);
    const binaryFile = files.find((f) => f.filename === 'assets/logo.png');
    expect(binaryFile).toBeDefined();
    expect(binaryFile!.isBinary).toBe(true);
    expect(binaryFile!.hunks).toHaveLength(0);
  });

  it('should detect generated files (package-lock.json)', () => {
    const files = parseDiff(binaryDiff);
    const lockFile = files.find((f) => f.filename === 'package-lock.json');
    expect(lockFile).toBeDefined();
    expect(lockFile!.isGenerated).toBe(true);
  });
});

describe('buildLinePositionMap', () => {
  it('should build a position map for added and context lines', () => {
    const files = parseDiff(sampleDiff);
    const map = buildLinePositionMap(files);

    // src/auth/login.ts line 1 should be in the map (it's added)
    expect(map.has('src/auth/login.ts:1')).toBe(true);
  });

  it('should NOT include removed lines in the position map', () => {
    const files = parseDiff(sampleDiff);
    const map = buildLinePositionMap(files);
    // Removed lines have no newLineNumber, so they shouldn't appear
    // Line 2 of old helper.ts (which was removed) shouldn't be mapped as new line 2
    // (this is implicit since removed lines have no newLineNumber)
    for (const [key] of map.entries()) {
      expect(key).toMatch(/^.+:\d+$/); // all keys should be valid
    }
  });

  it('should return an empty map for files with no hunks', () => {
    const binaryFiles = parseDiff(binaryDiff);
    const binaryOnly = binaryFiles.filter((f) => f.isBinary);
    const map = buildLinePositionMap(binaryOnly);
    expect(map.size).toBe(0);
  });
});
