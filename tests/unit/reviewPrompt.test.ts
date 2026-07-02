import { buildReviewPrompt, extractFilenamesFromDiff, filterHallucinatedFiles } from '../../src/prompts/reviewPrompt';
import { LLMReviewResponse } from '../../src/types';
import fs from 'fs';
import path from 'path';

const sampleDiff = fs.readFileSync(
  path.join(__dirname, '../fixtures/sampleDiff.txt'),
  'utf-8',
);

describe('buildReviewPrompt', () => {
  it('should include the PR title in the prompt', () => {
    const prompt = buildReviewPrompt(sampleDiff, 'Add user authentication');
    expect(prompt).toContain('Add user authentication');
  });

  it('should include the diff content in the prompt', () => {
    const prompt = buildReviewPrompt(sampleDiff, 'My PR');
    expect(prompt).toContain(sampleDiff);
  });

  it('should include the JSON schema definition', () => {
    const prompt = buildReviewPrompt(sampleDiff, 'My PR');
    expect(prompt).toContain('"severity"');
    expect(prompt).toContain('"critical"');
    expect(prompt).toContain('"estimated_risk"');
  });

  it('should NOT ask for markdown output', () => {
    const prompt = buildReviewPrompt(sampleDiff, 'My PR');
    expect(prompt).toContain('ONLY a valid JSON object');
    expect(prompt.toLowerCase()).toContain('no markdown');
  });

  it('should include a truncation notice when truncated=true', () => {
    const prompt = buildReviewPrompt(sampleDiff, 'My PR', true);
    expect(prompt).toContain('truncated due to size');
  });

  it('should NOT include a truncation notice when truncated=false (default)', () => {
    const prompt = buildReviewPrompt(sampleDiff, 'My PR', false);
    expect(prompt).not.toContain('TRUNCATED');
  });

  it('should handle special characters in PR title without breaking', () => {
    const specialTitle = 'Fix: user\'s "session" token & expiry < 24h';
    expect(() => buildReviewPrompt(sampleDiff, specialTitle)).not.toThrow();
    const prompt = buildReviewPrompt(sampleDiff, specialTitle);
    expect(prompt).toContain(specialTitle);
  });
});

describe('extractFilenamesFromDiff', () => {
  it('should extract filenames from a normal diff', () => {
    const filenames = extractFilenamesFromDiff(sampleDiff);
    expect(filenames.has('src/auth/login.ts')).toBe(true);
    expect(filenames.has('src/utils/helper.ts')).toBe(true);
  });

  it('should return an empty set for an empty diff', () => {
    expect(extractFilenamesFromDiff('')).toEqual(new Set());
  });
});

describe('filterHallucinatedFiles', () => {
  const response: LLMReviewResponse = {
    summary: 'Test PR',
    issues: [
      { file: 'src/auth/login.ts', line: 10, severity: 'critical', category: 'security', comment: 'Real issue' },
      { file: 'src/fake/nonexistent.ts', line: 5, severity: 'warning', category: 'bug', comment: 'Hallucinated file' },
    ],
    positives: [],
    estimated_risk: 'low',
  };

  it('should remove issues referencing files not in the diff', () => {
    const validFiles = new Set(['src/auth/login.ts', 'src/utils/helper.ts']);
    const filtered = filterHallucinatedFiles(response, validFiles);
    expect(filtered.issues).toHaveLength(1);
    expect(filtered.issues[0].file).toBe('src/auth/login.ts');
  });

  it('should preserve all issues when all files are valid', () => {
    const validFiles = new Set(['src/auth/login.ts', 'src/fake/nonexistent.ts']);
    const filtered = filterHallucinatedFiles(response, validFiles);
    expect(filtered.issues).toHaveLength(2);
  });

  it('should return empty issues when no files are valid', () => {
    const validFiles = new Set<string>();
    const filtered = filterHallucinatedFiles(response, validFiles);
    expect(filtered.issues).toHaveLength(0);
  });
});
