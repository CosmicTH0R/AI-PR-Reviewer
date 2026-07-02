import { validateLLMResponse } from '../../src/validators/llmResponseValidator';
import { LLMParseError } from '../../src/types';

const validResponse = {
  summary: 'This PR adds a new user authentication endpoint.',
  issues: [
    {
      file: 'src/auth/login.ts',
      line: 42,
      severity: 'critical',
      category: 'security',
      comment: 'SQL injection risk: user input is concatenated directly into the query string.',
    },
    {
      file: 'src/utils/helper.ts',
      line: null,
      severity: 'suggestion',
      category: 'style',
      comment: 'Consider extracting this logic into a separate utility function.',
    },
  ],
  positives: ['Good use of async/await throughout', 'Clear variable naming'],
  estimated_risk: 'high',
};

describe('validateLLMResponse', () => {
  // ─── Happy path ────────────────────────────────────────────────────────────

  it('should parse a valid JSON string correctly', () => {
    const result = validateLLMResponse(JSON.stringify(validResponse));
    expect(result.summary).toBe(validResponse.summary);
    expect(result.issues).toHaveLength(2);
    expect(result.estimated_risk).toBe('high');
  });

  it('should strip markdown code fences (```json ... ```)', () => {
    const fenced = '```json\n' + JSON.stringify(validResponse) + '\n```';
    const result = validateLLMResponse(fenced);
    expect(result.issues).toHaveLength(2);
  });

  it('should strip plain code fences (``` ... ```)', () => {
    const fenced = '```\n' + JSON.stringify(validResponse) + '\n```';
    const result = validateLLMResponse(fenced);
    expect(result.issues).toHaveLength(2);
  });

  it('should handle whitespace around the JSON', () => {
    const padded = '   \n' + JSON.stringify(validResponse) + '\n   ';
    const result = validateLLMResponse(padded);
    expect(result.summary).toBe(validResponse.summary);
  });

  it('should accept null line number', () => {
    const withNull = { ...validResponse, issues: [{ ...validResponse.issues[1] }] };
    const result = validateLLMResponse(JSON.stringify(withNull));
    expect(result.issues[0].line).toBeNull();
  });

  it('should default issues to [] when omitted', () => {
    const noIssues = { ...validResponse, issues: undefined };
    const result = validateLLMResponse(JSON.stringify(noIssues));
    expect(result.issues).toEqual([]);
  });

  it('should default positives to [] when omitted', () => {
    const noPositives = { ...validResponse, positives: undefined };
    const result = validateLLMResponse(JSON.stringify(noPositives));
    expect(result.positives).toEqual([]);
  });

  // ─── Error cases ───────────────────────────────────────────────────────────

  it('should throw LLMParseError for completely non-JSON input', () => {
    expect(() => validateLLMResponse('This is just prose, not JSON.')).toThrow(LLMParseError);
    expect(() => validateLLMResponse('This is just prose, not JSON.')).toThrow(
      'LLM response is not valid JSON',
    );
  });

  it('should throw LLMParseError for truncated/partial JSON', () => {
    expect(() => validateLLMResponse('{"summary": "incomplete')).toThrow(LLMParseError);
  });

  it('should throw LLMParseError when summary is missing', () => {
    const { summary: _s, ...noSummary } = validResponse;
    expect(() => validateLLMResponse(JSON.stringify(noSummary))).toThrow(LLMParseError);
    expect(() => validateLLMResponse(JSON.stringify(noSummary))).toThrow(
      'schema validation',
    );
  });

  it('should throw LLMParseError when estimated_risk is an invalid value', () => {
    const badRisk = { ...validResponse, estimated_risk: 'critical' }; // not a valid risk level
    expect(() => validateLLMResponse(JSON.stringify(badRisk))).toThrow(LLMParseError);
  });

  it('should throw LLMParseError when severity is an invalid enum', () => {
    const badSeverity = {
      ...validResponse,
      issues: [{ ...validResponse.issues[0], severity: 'error' }], // 'error' not in enum
    };
    expect(() => validateLLMResponse(JSON.stringify(badSeverity))).toThrow(LLMParseError);
  });

  it('should throw LLMParseError when category is invalid', () => {
    const badCategory = {
      ...validResponse,
      issues: [{ ...validResponse.issues[0], category: 'typo' }],
    };
    expect(() => validateLLMResponse(JSON.stringify(badCategory))).toThrow(LLMParseError);
  });

  it('should throw LLMParseError when line is a string instead of number', () => {
    const stringLine = {
      ...validResponse,
      issues: [{ ...validResponse.issues[0], line: '42' }], // string, not number
    };
    expect(() => validateLLMResponse(JSON.stringify(stringLine))).toThrow(LLMParseError);
  });

  it('should throw LLMParseError when issues exceeds 15 items', () => {
    const tooManyIssues = {
      ...validResponse,
      issues: Array.from({ length: 16 }, (_, i) => ({
        ...validResponse.issues[0],
        line: i + 1,
      })),
    };
    expect(() => validateLLMResponse(JSON.stringify(tooManyIssues))).toThrow(LLMParseError);
  });

  it('should include the raw response in the LLMParseError', () => {
    const badInput = 'definitely not json';
    try {
      validateLLMResponse(badInput);
      fail('Expected LLMParseError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(LLMParseError);
      expect((err as LLMParseError).rawResponse).toBe(badInput);
    }
  });
});
