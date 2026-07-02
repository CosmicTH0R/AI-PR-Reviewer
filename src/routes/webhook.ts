import { Router, Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature } from '../validators/webhookValidator';
import { checkRepoRateLimit } from '../middleware/rateLimiter';
import { WebhookPayload } from '../types';
import { logger } from '../utils/logger';

const router = Router();

import { processReview } from '../services/reviewer';

const RELEVANT_ACTIONS = new Set(['opened', 'synchronize', 'reopened']);

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    // ─── 1. Verify webhook signature ──────────────────────────────────
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('GITHUB_WEBHOOK_SECRET is not configured');
    }

    const rawBody: Buffer = (req as Request & { rawBody: Buffer }).rawBody;
    const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;

    verifyWebhookSignature(rawBody, signatureHeader, secret);

    // ─── 2. Filter event types ────────────────────────────────────────
    const eventType = req.headers['x-github-event'] as string;
    if (eventType !== 'pull_request') {
      logger.debug(`[webhook] Ignoring non-PR event: ${eventType}`);
      res.status(200).json({ message: 'Event ignored' });
      return;
    }

    const payload = req.body as WebhookPayload;

    // ─── 3. Filter PR actions ─────────────────────────────────────────
    if (!RELEVANT_ACTIONS.has(payload.action)) {
      logger.debug(`[webhook] Ignoring PR action: ${payload.action}`);
      res.status(200).json({ message: `Action "${payload.action}" ignored` });
      return;
    }

    // ─── 4. Require installation ID (GitHub App flow) ─────────────────
    if (!payload.installation?.id) {
      logger.warn('[webhook] No installation ID in payload — is this a GitHub App webhook?');
      res.status(400).json({ error: 'Missing installation ID' });
      return;
    }

    const repoFullName = payload.repository.full_name;
    const prNumber = payload.pull_request.number;
    const headSha = payload.pull_request.head.sha;

    logger.info(`[webhook] PR #${prNumber} ${payload.action} on ${repoFullName}`, {
      headSha: headSha.slice(0, 7),
      installationId: payload.installation.id,
    });

    // ─── 5. Per-repo rate limit check ─────────────────────────────────
    if (!checkRepoRateLimit(repoFullName)) {
      logger.warn(`[webhook] Rate limit exceeded for repo: ${repoFullName}`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many reviews for ${repoFullName}. Try again later.`,
      });
      return;
    }

    // ─── 6. Respond immediately (GitHub expects < 10s) ────────────────
    res.status(202).json({
      message: 'Webhook received, processing review',
      pr: prNumber,
      repo: repoFullName,
    });

    // ─── 7. Process review asynchronously ─────────────────────────────
    processReview(payload).catch((err: Error) => {
      logger.error(`[webhook] Review processing failed for PR #${prNumber}`, {
        error: err.message,
      });
    });
  } catch (err) {
    next(err);
  }
});

export default router;
