import { z } from 'zod';
import { LLMParseError, LLMReviewResponse } from '../types';

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const IssueSchema = z.object({
  file: z.string().min(1, 'file path cannot be empty'),
  line: z.union([z.number().int().positive(), z.null()]),
  severity: z.enum(['critical', 'warning', 'suggestion']),
  category: z.enum(['bug', 'security', 'style', 'performance', 'logic', 'documentation']),
  comment: z.string().min(1, 'comment cannot be empty'),
});

export const LLMResponseSchema = z.object({
  summary: z.string().min(1),
  issues: z
    .array(IssueSchema)
    .max(15, 'LLM returned more than 15 issues')
    .default([]),
  positives: z.array(z.string()).max(3).default([]),
  estimated_risk: z.enum(['low', 'medium', 'high']),
});

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * Strips markdown code fences that some models wrap JSON in.
 * Handles: ```json ... ```, ``` ... ```, and leading/trailing whitespace.
 */
function stripMarkdownFences(raw: string): string {
  const fencePattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/;
  const match = raw.trim().match(fencePattern);
  return match ? match[1].trim() : raw.trim();
}

/**
 * Parses and validates the raw LLM response string into a typed LLMReviewResponse.
 *
 * Steps:
 *  1. Strip any markdown code fences
 *  2. JSON.parse
 *  3. Zod schema validation
 *
 * @throws {LLMParseError} if the string cannot be parsed or doesn't match the schema
 */
export function validateLLMResponse(raw: string): LLMReviewResponse {
  const cleaned = stripMarkdownFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new LLMParseError(
      `LLM response is not valid JSON: ${(e as Error).message}`,
      raw,
    );
  }

  const result = LLMResponseSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new LLMParseError(`LLM response failed schema validation: ${issues}`, raw);
  }

  return result.data as LLMReviewResponse;
}
