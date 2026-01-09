import axios, { type AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import authService from './authService';
import metricsService from './metricsService';

export interface ExternalProduct {
  id: string;
  name: string;
  price: number;
}

class ExternalApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 10000,
    });

    // Configure exponential backoff retry
    axiosRetry(this.axiosInstance, {
      retries: 3,
      retryDelay: (retryCount) => {
        return Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      },
      retryCondition: (error) => {
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status === 429 ||
          error.response?.status === 503
        );
      },
    });
  }

  /**
   * API A - Synchronous: Fetch product data with timeout and retry
   */
  async fetchProductsFromApiA(): Promise<ExternalProduct[]> {
    const startTime = Date.now();
    try {
      const token = await authService.getAccessToken();

      const response = await this.axiosInstance.get<ExternalProduct[]>(
        'https://jsonplaceholder.typicode.com/users', // Mock API
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000,
        }
      );

      // Track metrics
      const responseTime = Date.now() - startTime;
      metricsService.recordApiCall(responseTime, false);

      // Transform mock data to our format
      return response.data.slice(0, 10).map((user: any) => ({
        id: user.id.toString(),
        name: user.name,
        price: Math.random() * 100,
      }));
    } catch (error) {
      const responseTime = Date.now() - startTime;
      metricsService.recordApiCall(responseTime, true);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('API A request timeout');
        }
        throw new Error(`API A error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * API B - Register callback URL for webhook
   */
  async registerWebhook(callbackUrl: string): Promise<void> {
    try {
      const token = await authService.getAccessToken();

      await this.axiosInstance.post(
        'https://httpbin.org/post', // Mock webhook registration
        {
          callback_url: callbackUrl,
          events: ['order.created', 'order.updated'],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(`Webhook registered: ${callbackUrl}`);
    } catch (error) {
      console.error('Failed to register webhook:', error);
      throw new Error('Webhook registration failed');
    }
  }
}

export default new ExternalApiService();
