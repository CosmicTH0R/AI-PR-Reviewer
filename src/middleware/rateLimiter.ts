import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

/**
 * Global webhook endpoint rate limiter.
 * Prevents abuse and protects LLM API quota from being exhausted by a flood of requests.
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: parseInt(process.env.WEBHOOK_RATE_LIMIT || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Rate limit exceeded. Try again later.' },
  handler: (req, res, _next, options) => {
    logger.warn(`[rate-limit] Global rate limit exceeded`, { ip: req.ip });
    res.status(429).json(options.message);
  },
});

/**
 * In-memory per-repo rate limiter.
 * Limits how many reviews a single repo can trigger per hour.
 * Prevents a busy repo from consuming all LLM quota.
 */
const repoReviewCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_REVIEWS_PER_REPO_PER_HOUR = parseInt(
  process.env.MAX_REVIEWS_PER_REPO || '5',
  10,
);

export function checkRepoRateLimit(repoFullName: string): boolean {
  const now = Date.now();
  const entry = repoReviewCounts.get(repoFullName);

  if (!entry || now > entry.resetAt) {
    // First request or window expired — reset
    repoReviewCounts.set(repoFullName, {
      count: 1,
      resetAt: now + 60 * 60 * 1000, // 1 hour
    });
    return true; // allowed
  }

  if (entry.count >= MAX_REVIEWS_PER_REPO_PER_HOUR) {
    logger.warn(`[rate-limit] Repo rate limit exceeded`, { repo: repoFullName });
    return false; // blocked
  }

  entry.count++;
  return true; // allowed
}
