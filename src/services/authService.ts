import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import redisClient from '../config/redis';
import metricsService from './metricsService';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

class AuthService {
  private axiosInstance: AxiosInstance;
  private tokenCacheKey = 'oauth2:access_token';
  private clientId: string;
  private clientSecret: string;
  private tokenUrl: string;

  constructor() {
    // Mock OAuth2 provider - in production, use real provider like Auth0
    this.clientId = process.env.OAUTH_CLIENT_ID || 'mock-client-id';
    this.clientSecret = process.env.OAUTH_CLIENT_SECRET || 'mock-client-secret';
    this.tokenUrl = process.env.OAUTH_TOKEN_URL || 'https://httpbin.org/post'; 

    this.axiosInstance = axios.create({
      timeout: 5000,
    });

    // Configure retry logic
    axiosRetry(this.axiosInstance, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
      },
    });
  }

  /**
   * Get access token with caching and automatic refresh
   */
  async getAccessToken(): Promise<string> {
    // Check cache first
    const cachedToken = await redisClient.get(this.tokenCacheKey);
    if (cachedToken) {
      metricsService.recordTokenCacheHit();
      return cachedToken;
    }

    // Fetch new token
    metricsService.recordTokenFetch();
    const token = await this.fetchAccessToken();
    return token;
  }

  /**
   * Fetch access token from OAuth2 provider
   */
  private async fetchAccessToken(): Promise<string> {
    try {
      const response = await this.axiosInstance.post<TokenResponse>(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // For mock endpoint, create a mock token
      const accessToken = response.data.access_token || `mock-token-${Date.now()}`;
      const expiresIn = response.data.expires_in || 3600;

      // Cache token with expiry (subtract 60s for safety margin)
      await redisClient.setEx(this.tokenCacheKey, expiresIn - 60, accessToken);

      return accessToken;
    } catch (error) {
      console.error('Failed to fetch access token:', error);
      throw new Error('OAuth2 authentication failed');
    }
  }

  /**
   * Invalidate cached token (useful for testing or forced refresh)
   */
  async invalidateToken(): Promise<void> {
    metricsService.recordTokenRefresh();
    await redisClient.del(this.tokenCacheKey);
  }
}

export default new AuthService();
