import { truncateDiff, filterAndSerializeDiff } from '../../src/utils/diffTruncator';
import { parseDiff } from '../../src/utils/diffParser';
import fs from 'fs';
import path from 'path';

const sampleDiff = fs.readFileSync(
  path.join(__dirname, '../fixtures/sampleDiff.txt'),
  'utf-8',
);

describe('truncateDiff', () => {
  it('should return the original diff when under the limit', () => {
    const result = truncateDiff(sampleDiff, 1_000_000); // huge limit
    expect(result.truncated).toBe(false);
    expect(result.diff).toBe(sampleDiff);
    expect(result.omittedFiles).toHaveLength(0);
  });

  it('should truncate when diff exceeds the limit', () => {
    // Set a tiny limit so even a small diff gets truncated
    const result = truncateDiff(sampleDiff, 100);
    expect(result.truncated).toBe(true);
    expect(result.omittedFiles.length).toBeGreaterThan(0);
  });

  it('should include a truncation notice listing omitted files', () => {
    const result = truncateDiff(sampleDiff, 100);
    expect(result.diff).toContain('[TRUNCATED:');
    expect(result.diff).toContain('Omitted files:');
  });

  it('should not truncate when diff is exactly at the limit', () => {
    const result = truncateDiff(sampleDiff, sampleDiff.length);
    expect(result.truncated).toBe(false);
  });

  it('should keep whole files (not cut mid-file)', () => {
    const result = truncateDiff(sampleDiff, 100);
    if (result.includedFiles.length > 0) {
      // The included diff should still be parseable
      const parsed = parseDiff(result.diff);
      // All parsed files should be in includedFiles
      parsed.forEach((f) => {
        expect(result.includedFiles).toContain(f.filename);
      });
    }
  });

  it('should sort by file size (larger changes included first) when truncating', () => {
    // Create a diff where we know file A has more changes than file B
    // and verify that when truncating to include only 1 file, it's the larger one
    const bigFile = 'diff --git a/big.ts b/big.ts\nnew file mode 100644\n--- /dev/null\n+++ b/big.ts\n@@ -0,0 +1,5 @@\n+line1\n+line2\n+line3\n+line4\n+line5\n';
    const smallFile = 'diff --git a/small.ts b/small.ts\nnew file mode 100644\n--- /dev/null\n+++ b/small.ts\n@@ -0,0 +1,1 @@\n+line1\n';
    const combined = bigFile + smallFile;

    // Limit allows only ~bigFile's size worth of content
    const result = truncateDiff(combined, bigFile.length + 10);
    expect(result.includedFiles).toContain('big.ts');
    expect(result.omittedFiles).toContain('small.ts');
  });
});

describe('filterAndSerializeDiff', () => {
  const binaryDiff = fs.readFileSync(
    path.join(__dirname, '../fixtures/binaryDiff.txt'),
    'utf-8',
  );

  it('should exclude binary files', () => {
    const files = parseDiff(binaryDiff);
    const serialized = filterAndSerializeDiff(files, binaryDiff);
    expect(serialized).not.toContain('Binary files');
    expect(serialized).not.toContain('logo.png');
  });

  it('should exclude generated files (package-lock.json)', () => {
    const files = parseDiff(binaryDiff);
    const serialized = filterAndSerializeDiff(files, binaryDiff);
    expect(serialized).not.toContain('package-lock.json');
  });

  it('should include normal source files', () => {
    const files = parseDiff(binaryDiff);
    const serialized = filterAndSerializeDiff(files, binaryDiff);
    expect(serialized).toContain('src/index.ts');
  });
});
