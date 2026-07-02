import { WebhookPayload } from '../types';
import { githubService } from './github';
import { llmService } from './llm';
import { parseDiff, buildLinePositionMap } from '../utils/diffParser';
import { truncateDiff } from '../utils/diffTruncator';
import { Review } from '../models/Review';
import { logger } from '../utils/logger';

export async function processReview(payload: WebhookPayload): Promise<void> {
  const repoFullName = payload.repository.full_name;
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const prNumber = payload.pull_request.number;
  const prTitle = payload.pull_request.title;
  const headSha = payload.pull_request.head.sha;
  const installationId = payload.installation!.id; // Checked in route
  
  logger.info(`[reviewer] Starting review for ${repoFullName}#${prNumber} at commit ${headSha.slice(0, 7)}`);
  const startTime = Date.now();

  try {
    // ─── 1. Idempotency Check ──────────────────────────────────────────────────
    // Don't review the exact same commit twice if GitHub retries the webhook
    const existingReview = await Review.findOne({ repoFullName, prNumber, headSha });
    if (existingReview) {
      logger.info(`[reviewer] Skipping: Review already exists for ${repoFullName}#${prNumber} @ ${headSha}`);
      return;
    }

    // ─── 2. Fetch Diff ─────────────────────────────────────────────────────────
    logger.info(`[reviewer] Fetching diff...`);
    const rawDiff = await githubService.getPRDiff(installationId, owner, repo, prNumber);

    if (!rawDiff || rawDiff.trim() === '') {
      logger.info(`[reviewer] Diff is empty for PR #${prNumber}. Posting 'no changes' review.`);
      await githubService.postReview(installationId, owner, repo, prNumber, headSha, [], 'No code changes found in this PR.', new Map());
      await Review.create({
        prUrl: payload.pull_request.html_url,
        repoFullName,
        prNumber,
        prTitle,
        headSha,
        status: 'no_changes',
        summary: 'No code changes found',
      });
      return;
    }

    // ─── 3. Parse & Truncate Diff ──────────────────────────────────────────────
    logger.info(`[reviewer] Parsing diff...`);
    // First, truncate if it's massive
    const { diff: safeDiff, truncated, omittedFiles } = truncateDiff(rawDiff);
    
    // Parse the safe diff into structured file/hunk data
    const parsedFiles = parseDiff(safeDiff);
    
    // Build the position map we need for posting comments to GitHub later
    const positionMap = buildLinePositionMap(parsedFiles);

    // ─── 4. AI Review ──────────────────────────────────────────────────────────
    logger.info(`[reviewer] Sending to LLM...`);
    const { response: llmOutput, inputTokens, outputTokens } = await llmService.reviewCode(
      safeDiff,
      prTitle,
      truncated
    );

    // ─── 5. Post Review to GitHub ──────────────────────────────────────────────
    logger.info(`[reviewer] Posting ${llmOutput.issues.length} comments to GitHub...`);
    await githubService.postReview(
      installationId,
      owner,
      repo,
      prNumber,
      headSha,
      llmOutput.issues,
      llmOutput.summary,
      positionMap
    );

    // ─── 6. Save to Database ───────────────────────────────────────────────────
    const processingMs = Date.now() - startTime;
    await Review.create({
      prUrl: payload.pull_request.html_url,
      repoFullName,
      prNumber,
      prTitle,
      headSha,
      issues: llmOutput.issues,
      summary: llmOutput.summary,
      estimatedRisk: llmOutput.estimated_risk,
      positives: llmOutput.positives,
      inputTokens,
      outputTokens,
      processingMs,
      truncated,
      truncatedFileCount: omittedFiles.length,
      status: 'success',
    });

    logger.info(`[reviewer] Completed review for PR #${prNumber} in ${processingMs}ms`);

  } catch (err) {
    // ─── Failure Handling ──────────────────────────────────────────────────────
    const processingMs = Date.now() - startTime;
    const errorMessage = (err as Error).message;
    logger.error(`[reviewer] Review failed for PR #${prNumber}`, { error: errorMessage });

    // Try to post an error comment back to the PR
    await githubService.postErrorComment(installationId, owner, repo, prNumber, errorMessage);

    // Save the failed attempt to DB
    await Review.create({
      prUrl: payload.pull_request.html_url,
      repoFullName,
      prNumber,
      prTitle,
      headSha,
      processingMs,
      status: 'failed',
      errorMessage,
    }).catch(dbErr => logger.error('[db] Failed to save error record', { error: dbErr.message }));
  }
}
