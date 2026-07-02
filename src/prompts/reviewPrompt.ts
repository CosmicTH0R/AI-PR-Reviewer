import { LLMReviewResponse } from '../types';

/**
 * Builds the prompt sent to Gemini for PR code review.
 *
 * Design principles:
 * - Schema-first: present the JSON contract BEFORE the diff so the model
 *   treats it as an output contract, not a suggestion.
 * - No mixed output: explicit "ONLY a valid JSON object" prevents prose leaking.
 * - Rule-based constraints: prevent hallucination of line numbers on removed lines,
 *   cap at 15 issues to control token usage.
 *
 * Note: When using Gemini with responseMimeType: "application/json", the
 * model is further constrained at the API level — this prompt is defense-in-depth.
 */
export function buildReviewPrompt(diff: string, prTitle: string, truncated = false): string {
  const truncationNotice = truncated
    ? '\n⚠️  NOTE: This diff has been truncated due to size. Focus on the files shown.\n'
    : '';

  return `You are an expert code reviewer. Analyze the following pull request diff and return ONLY a valid JSON object — no markdown, no explanation, no code fences.

PR Title: "${prTitle}"
${truncationNotice}
The JSON must conform exactly to this schema:
{
  "summary": "string (1-2 sentences describing the overall change)",
  "issues": [
    {
      "file": "string (exact filename from diff, e.g. src/utils/helper.ts)",
      "line": number (the NEW file line number this issue refers to, or null if file-level),
      "severity": "critical" | "warning" | "suggestion",
      "category": "bug" | "security" | "style" | "performance" | "logic" | "documentation",
      "comment": "string (specific, actionable feedback — reference the code directly)"
    }
  ],
  "positives": ["string array of things done well, max 3 items"],
  "estimated_risk": "low" | "medium" | "high"
}

Rules:
- Only report real issues visible in this diff. Do not hallucinate problems.
- "critical" = likely causes runtime bugs, data loss, or security vulnerabilities
- "warning" = code smell, unhandled edge case, unclear logic, missing error handling
- "suggestion" = style, naming, optional improvement that won't cause bugs
- If a line is in a removed section (prefixed with -), do not comment on it
- The "file" field must exactly match a filename appearing in the diff header (e.g. "--- a/src/foo.ts" → "src/foo.ts")
- The "line" field must be a line number that appears in an added (+) or context line in the diff, or null
- If no issues found, return "issues": []
- Maximum 15 issues total. If more exist, prioritize by severity (critical first)
- "positives" should note genuinely good patterns, not generic praise

DIFF:
${diff}

Respond with ONLY the JSON object:`;
}

/**
 * Extracts the list of valid filenames from a diff string.
 * Used to validate that LLM-returned file names actually exist in the diff.
 */
export function extractFilenamesFromDiff(diff: string): Set<string> {
  const filenames = new Set<string>();
  const lines = diff.split('\n');

  for (const line of lines) {
    // Match "--- a/path/to/file" or "+++ b/path/to/file"
    const match = line.match(/^(?:---|\+\+\+) [ab]\/(.+)$/);
    if (match) {
      filenames.add(match[1]);
    }
    // Also match "diff --git a/path b/path"
    const gitMatch = line.match(/^diff --git a\/(.+) b\/.+$/);
    if (gitMatch) {
      filenames.add(gitMatch[1]);
    }
  }

  return filenames;
}

/**
 * Filters out LLM-hallucinated file references that don't exist in the diff.
 */
export function filterHallucinatedFiles(
  response: LLMReviewResponse,
  validFilenames: Set<string>,
): LLMReviewResponse {
  const filteredIssues = response.issues.filter((issue) => {
    const valid = validFilenames.has(issue.file);
    if (!valid) {
      console.warn(`[prompt] Dropped hallucinated file reference: "${issue.file}"`);
    }
    return valid;
  });

  return { ...response, issues: filteredIssues };
}
