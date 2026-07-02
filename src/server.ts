import dotenv from 'dotenv';
dotenv.config(); // MUST be first — services read env vars at import time

import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { webhookRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import webhookRouter from './routes/webhook';
import reviewsRouter from './routes/reviews';
import { logger } from './utils/logger';

const app = express();

// ─── Raw body capture (required for HMAC verification) ──────────────────────
// We need the raw Buffer before Express parses the JSON.
// This middleware captures it and attaches it to req.rawBody.
app.use(
  express.json({
    limit: '10mb',
    verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/webhook', webhookRateLimiter, webhookRouter);
app.use('/api/reviews', reviewsRouter);

// Health check endpoint (used by Render/Railway to verify the service is up)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongoState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ─── Error handler (must be last) ────────────────────────────────────────────
app.use(errorHandler);

// ─── MongoDB Connection ───────────────────────────────────────────────────────
async function connectToMongo(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  logger.info('[db] Connected to MongoDB');
}

// ─── Server Startup ───────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);

async function start(): Promise<void> {
  try {
    await connectToMongo();

    app.listen(PORT, () => {
      logger.info(`[server] AI PR Reviewer running on port ${PORT}`);
      logger.info(`[server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    logger.error('[server] Startup failed', { error: (err as Error).message });
    process.exit(1);
  }
}

start();

export { app }; // exported for supertest in integration tests
