import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { logger } from '../utils/logger';
import { LLMIssue } from '../types';

/**
 * Creates an Octokit instance authenticated as a GitHub App installation.
 * Uses @octokit/auth-app (CJS-compatible) instead of the ESM-only @octokit/app.
 */
function createInstallationOctokit(installationId: number): Octokit {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!appId || !privateKey) {
    throw new Error('GITHUB_APP_ID and GITHUB_PRIVATE_KEY must be set');
  }

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      installationId,
    },
  });
}

export class GitHubService {
  /**
   * Fetches the raw unified diff of a pull request.
   */
  async getPRDiff(
    installationId: number,
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<string> {
    const octokit = createInstallationOctokit(installationId);

    try {
      // mediaType: { format: 'diff' } makes GitHub return the raw diff text
      const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
        mediaType: { format: 'diff' },
      });

      return data as unknown as string;
    } catch (err) {
      logger.error(`[github] Failed to fetch diff for PR #${pullNumber}`, {
        repo: `${owner}/${repo}`,
        error: (err as Error).message,
      });
      throw new Error(`Failed to fetch diff for ${owner}/${repo}#${pullNumber}`);
    }
  }

  /**
   * Posts a full review with inline comments to the PR.
   */
  async postReview(
    installationId: number,
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    issues: LLMIssue[],
    summary: string,
    positionMap: Map<string, number>,
  ): Promise<void> {
    const octokit = createInstallationOctokit(installationId);

    // Map our LLMIssue format to GitHub's review comment format
    const comments = issues
      .map((issue) => {
        if (!issue.line) return null; // File-level issues go into the summary body

        const positionKey = `${issue.file}:${issue.line}`;
        const position = positionMap.get(positionKey);

        if (!position) {
          logger.warn(`[github] Could not find diff position for ${positionKey} — dropping inline comment`);
          return null;
        }

        const icon = this.getSeverityIcon(issue.severity);
        const body = `**${icon} ${issue.severity.toUpperCase()}** (${issue.category})\n\n${issue.comment}`;

        return { path: issue.file, position, body };
      })
      .filter(Boolean) as Array<{ path: string; position: number; body: string }>;

    // Build the main review body
    let reviewBody = `## 🤖 AI PR Review\n\n${summary}\n\n`;

    // Append file-level issues (no specific line) to the body
    const fileLevelIssues = issues.filter((i) => !i.line);
    if (fileLevelIssues.length > 0) {
      reviewBody += '### General Feedback\n\n';
      for (const issue of fileLevelIssues) {
        reviewBody += `- **${issue.file}** (${this.getSeverityIcon(issue.severity)} ${issue.severity}): ${issue.comment}\n`;
      }
      reviewBody += '\n';
    }

    if (issues.length === 0) {
      reviewBody += '✅ **No issues found.** The code looks good!';
    }

    try {
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: pullNumber,
        commit_id: commitId,
        event: issues.some((i) => i.severity === 'critical') ? 'REQUEST_CHANGES' : 'COMMENT',
        body: reviewBody,
        comments,
      });
      logger.info(`[github] Posted review with ${comments.length} inline comments to PR #${pullNumber}`);
    } catch (err) {
      logger.error(`[github] Failed to post review to PR #${pullNumber}`, {
        error: (err as Error).message,
      });
      throw new Error(`Failed to post review: ${(err as Error).message}`);
    }
  }

  /**
   * Posts a simple error comment when the AI reviewer crashes mid-pipeline.
   */
  async postErrorComment(
    installationId: number,
    owner: string,
    repo: string,
    pullNumber: number,
    errorMessage: string,
  ): Promise<void> {
    try {
      const octokit = createInstallationOctokit(installationId);
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body: `❌ **AI PR Reviewer Failed**\n\nI encountered an error while trying to review this PR:\n\`\`\`\n${errorMessage}\n\`\`\`\n\n*Please check the server logs for details.*`,
      });
    } catch (err) {
      // Don't throw — this is a best-effort notification
      logger.error(`[github] Failed to post error comment to PR #${pullNumber}`, {
        error: (err as Error).message,
      });
    }
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical':    return '🚨';
      case 'warning':     return '⚠️';
      case 'suggestion':  return '💡';
      default:            return '💬';
    }
  }
}

// Singleton instance used across the app
export const githubService = new GitHubService();
