// Shared TypeScript types for the AI PR Reviewer

export interface WebhookPayload {
  action: string;
  number: number;
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    head: {
      sha: string;
      ref: string;
    };
    base: {
      ref: string;
    };
    diff_url: string;
    state: string;
    user: {
      login: string;
    };
  };
  repository: {
    full_name: string;
    name: string;
    owner: {
      login: string;
    };
    private: boolean;
  };
  installation?: {
    id: number;
  };
  sender: {
    login: string;
  };
}

export interface ParsedDiffFile {
  filename: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'binary' | 'unknown';
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  isBinary: boolean;
  isGenerated: boolean;
}

export interface DiffHunk {
  header: string;
  /** The 1-based starting line number in the new file for this hunk */
  newFileStart: number;
  lines: DiffLine[];
}

export interface DiffLine {
  /** '+' = added, '-' = removed, ' ' = context */
  type: '+' | '-' | ' ';
  content: string;
  /** Line number in the new file (undefined for removed lines) */
  newLineNumber?: number;
  /** Line number in the old file (undefined for added lines) */
  oldLineNumber?: number;
  /** Position within the diff (counting from 1 for each hunk's first line after header) */
  diffPosition: number;
}

export interface LLMIssue {
  file: string;
  line: number | null;
  severity: 'critical' | 'warning' | 'suggestion';
  category: 'bug' | 'security' | 'style' | 'performance' | 'logic' | 'documentation';
  comment: string;
}

export interface LLMReviewResponse {
  summary: string;
  issues: LLMIssue[];
  positives: string[];
  estimated_risk: 'low' | 'medium' | 'high';
}

export interface ReviewRecord {
  prUrl: string;
  repoFullName: string;
  prNumber: number;
  prTitle: string;
  headSha: string;
  reviewedAt: Date;
  issues: LLMIssue[];
  summary: string;
  estimatedRisk: 'low' | 'medium' | 'high';
  positives: string[];
  inputTokens: number;
  outputTokens: number;
  processingMs: number;
  truncated: boolean;
  truncatedFileCount: number;
  status: 'success' | 'failed' | 'no_changes';
  errorMessage?: string;
}

export class LLMParseError extends Error {
  constructor(
    message: string,
    public readonly rawResponse: string,
  ) {
    super(message);
    this.name = 'LLMParseError';
  }
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}
