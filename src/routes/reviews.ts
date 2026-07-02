import { Router, Request, Response } from 'express';
import { Review } from '../models/Review';
import { logger } from '../utils/logger';

const router = Router();

/** GET /api/reviews — paginated list of past reviews, newest first */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || '10', 10)));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find()
        .sort({ reviewedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Review.countDocuments(),
    ]);

    res.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error('[reviews] Failed to fetch reviews', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/** GET /api/reviews/stats — aggregate stats for dashboard */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [totalReviews, issueStats, tokenStats] = await Promise.all([
      Review.countDocuments({ status: 'success' }),
      Review.aggregate([
        { $match: { status: 'success' } },
        { $unwind: { path: '$issues', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            totalIssues: { $sum: { $cond: [{ $ifNull: ['$issues', false] }, 1, 0] } },
            criticalIssues: {
              $sum: { $cond: [{ $eq: ['$issues.severity', 'critical'] }, 1, 0] },
            },
            warningIssues: {
              $sum: { $cond: [{ $eq: ['$issues.severity', 'warning'] }, 1, 0] },
            },
            suggestionIssues: {
              $sum: { $cond: [{ $eq: ['$issues.severity', 'suggestion'] }, 1, 0] },
            },
          },
        },
      ]),
      Review.aggregate([
        { $match: { status: 'success' } },
        {
          $group: {
            _id: null,
            totalInputTokens: { $sum: '$inputTokens' },
            totalOutputTokens: { $sum: '$outputTokens' },
            avgProcessingMs: { $avg: '$processingMs' },
          },
        },
      ]),
    ]);

    res.json({
      totalReviews,
      issues: issueStats[0] || { totalIssues: 0, criticalIssues: 0, warningIssues: 0, suggestionIssues: 0 },
      tokens: tokenStats[0] || { totalInputTokens: 0, totalOutputTokens: 0, avgProcessingMs: 0 },
    });
  } catch (err) {
    logger.error('[reviews] Failed to fetch stats', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/** GET /api/reviews/:id — single review detail */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const review = await Review.findById(req.params.id).select('-__v');
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    res.json(review);
  } catch (err) {
    logger.error('[reviews] Failed to fetch review', { id: req.params.id, error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

export default router;
