import express, { type Application, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import { connectRedis } from './config/redis';
import { errorHandler } from './middlewares/errorHandler';
import { rateLimitMiddleware } from './middlewares/rateLimiter';
import productRoutes from './routes/productRoutes';
import webhookRoutes from './routes/webhookRoutes';
import metricsRoutes from './routes/metricsRoutes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all routes
app.use(rateLimitMiddleware);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/metrics', metricsRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to Redis
    await connectRedis();
    console.log('Redis connected successfully');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Products API: http://localhost:${PORT}/api/products`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
