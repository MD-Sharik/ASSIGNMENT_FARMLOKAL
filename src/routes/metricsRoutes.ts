import { Router, Request, Response } from 'express';
import metricsService from '../services/metricsService';

const router = Router();

/**
 * GET /metrics
 * Returns application metrics including performance, caching, and API health
 */
router.get('/', (req: Request, res: Response) => {
  const metrics = metricsService.getMetrics();

  res.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    metrics,
  });
});

/**
 * POST /metrics/reset
 * Reset all metrics (development/testing only)
 */
router.post('/reset', (req: Request, res: Response) => {
  metricsService.reset();
  res.json({
    status: 'success',
    message: 'Metrics reset successfully',
  });
});

export default router;
