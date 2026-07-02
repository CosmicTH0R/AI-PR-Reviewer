import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { WebhookVerificationError, LLMParseError } from '../types';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof WebhookVerificationError) {
    logger.warn(`[security] Webhook verification failed: ${err.message}`, {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid webhook signature' });
    return;
  }

  if (err instanceof LLMParseError) {
    logger.error(`[llm] Parse error: ${err.message}`);
    res.status(500).json({ error: 'LLM parse error', message: err.message });
    return;
  }

  logger.error(`[server] Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
}
