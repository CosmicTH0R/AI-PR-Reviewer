export type Review = {
  _id: string;
  prUrl: string;
  repoFullName: string;
  prNumber: number;
  prTitle: string;
  headSha: string;
  reviewedAt: string;
  issues: Issue[];
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
};

export type Issue = {
  file: string;
  line: number | null;
  severity: 'critical' | 'warning' | 'suggestion';
  category: 'bug' | 'security' | 'style' | 'performance' | 'logic' | 'documentation';
  comment: string;
};

export type Stats = {
  totalReviews: number;
  issues: {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    suggestionIssues: number;
  };
  tokens: {
    totalInputTokens: number;
    totalOutputTokens: number;
    avgProcessingMs: number;
  };
};

export type PaginatedReviews = {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};
