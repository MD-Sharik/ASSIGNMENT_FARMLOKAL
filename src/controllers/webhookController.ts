import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler';
import redisClient from '../config/redis';
import metricsService from '../services/metricsService';

interface WebhookEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  data: any;
}

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const event: WebhookEvent = req.body;
  metricsService.recordWebhookEvent();

  // Validate event structure
  if (!event.event_id || !event.event_type) {
    res.status(400).json({
      status: 'error',
      message: 'Invalid webhook payload',
    });
    return;
  }

  // Check for duplicate events (idempotency)
  const eventKey = `webhook:event:${event.event_id}`;
  const exists = await redisClient.exists(eventKey);

  if (exists) {
    // Event already processed
    metricsService.recordDuplicateWebhook();
    res.status(200).json({
      status: 'success',
      message: 'Event already processed',
    });
    return;
  }

  // Process the event
  console.log(`Processing webhook event: ${event.event_type}`, event.data);
  metricsService.recordProcessedWebhook();

  // Store event ID to prevent duplicate processing (TTL: 24 hours)
  await redisClient.setEx(eventKey, 86400, JSON.stringify(event));

  // Simulate event processing
  // In production, this would trigger business logic based on event_type

  res.status(200).json({
    status: 'success',
    message: 'Webhook received and processed',
  });
});
