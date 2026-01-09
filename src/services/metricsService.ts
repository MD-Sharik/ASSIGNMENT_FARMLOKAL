/**
 * Metrics service for tracking application performance and health
 */

interface Metrics {
  uptime: number;
  requests: {
    total: number;
    successful: number;
    failed: number;
    rateLimit: number;
  };
  products: {
    queriesTotal: number;
    cacheHits: number;
    cacheMisses: number;
    avgResponseTime: number;
  };
  oauth: {
    tokenFetches: number;
    tokenCacheHits: number;
    refreshes: number;
  };
  webhook: {
    eventsReceived: number;
    eventsDuplicate: number;
    eventsProcessed: number;
  };
  externalApi: {
    apiACalls: number;
    apiAErrors: number;
    apiAAvgTime: number;
    circuitBreakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  };
}

class MetricsService {
  private startTime: number = Date.now();
  private metrics: Metrics = {
    uptime: 0,
    requests: {
      total: 0,
      successful: 0,
      failed: 0,
      rateLimit: 0,
    },
    products: {
      queriesTotal: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgResponseTime: 0,
    },
    oauth: {
      tokenFetches: 0,
      tokenCacheHits: 0,
      refreshes: 0,
    },
    webhook: {
      eventsReceived: 0,
      eventsDuplicate: 0,
      eventsProcessed: 0,
    },
    externalApi: {
      apiACalls: 0,
      apiAErrors: 0,
      apiAAvgTime: 0,
      circuitBreakerStatus: 'CLOSED',
    },
  };

  private responseTimes: number[] = [];
  private apiATimes: number[] = [];

  /**
   * Increment total requests
   */
  recordRequest(): void {
    this.metrics.requests.total++;
  }

  /**
   * Record successful request
   */
  recordSuccess(responseTime: number): void {
    this.metrics.requests.successful++;
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift(); // Keep last 1000 for moving average
    }
  }

  /**
   * Record failed request
   */
  recordFailure(): void {
    this.metrics.requests.failed++;
  }

  /**
   * Record rate limit hit
   */
  recordRateLimit(): void {
    this.metrics.requests.rateLimit++;
  }

  /**
   * Record product query
   */
  recordProductQuery(cacheHit: boolean, responseTime: number): void {
    this.metrics.products.queriesTotal++;
    if (cacheHit) {
      this.metrics.products.cacheHits++;
    } else {
      this.metrics.products.cacheMisses++;
    }
  }

  /**
   * Record OAuth token fetch
   */
  recordTokenFetch(): void {
    this.metrics.oauth.tokenFetches++;
  }

  /**
   * Record OAuth token cache hit
   */
  recordTokenCacheHit(): void {
    this.metrics.oauth.tokenCacheHits++;
  }

  /**
   * Record token refresh
   */
  recordTokenRefresh(): void {
    this.metrics.oauth.refreshes++;
  }

  /**
   * Record webhook event received
   */
  recordWebhookEvent(): void {
    this.metrics.webhook.eventsReceived++;
  }

  /**
   * Record duplicate webhook event
   */
  recordDuplicateWebhook(): void {
    this.metrics.webhook.eventsDuplicate++;
  }

  /**
   * Record processed webhook event
   */
  recordProcessedWebhook(): void {
    this.metrics.webhook.eventsProcessed++;
  }

  /**
   * Record external API call
   */
  recordApiCall(responseTime: number, error: boolean): void {
    this.metrics.externalApi.apiACalls++;
    if (error) {
      this.metrics.externalApi.apiAErrors++;
    }
    this.apiATimes.push(responseTime);
    if (this.apiATimes.length > 100) {
      this.apiATimes.shift();
    }
  }

  /**
   * Update circuit breaker status
   */
  setCircuitBreakerStatus(status: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
    this.metrics.externalApi.circuitBreakerStatus = status;
  }

  /**
   * Get current metrics
   */
  getMetrics(): Metrics {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const avgResponseTime = this.responseTimes.length > 0
      ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
      : 0;
    const avgApiTime = this.apiATimes.length > 0
      ? Math.round(this.apiATimes.reduce((a, b) => a + b, 0) / this.apiATimes.length)
      : 0;

    return {
      ...this.metrics,
      uptime,
      products: {
        ...this.metrics.products,
        avgResponseTime,
      },
      externalApi: {
        ...this.metrics.externalApi,
        apiAAvgTime: avgApiTime,
      },
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.startTime = Date.now();
    this.responseTimes = [];
    this.apiATimes = [];
    this.metrics = {
      uptime: 0,
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        rateLimit: 0,
      },
      products: {
        queriesTotal: 0,
        cacheHits: 0,
        cacheMisses: 0,
        avgResponseTime: 0,
      },
      oauth: {
        tokenFetches: 0,
        tokenCacheHits: 0,
        refreshes: 0,
      },
      webhook: {
        eventsReceived: 0,
        eventsDuplicate: 0,
        eventsProcessed: 0,
      },
      externalApi: {
        apiACalls: 0,
        apiAErrors: 0,
        apiAAvgTime: 0,
        circuitBreakerStatus: 'CLOSED',
      },
    };
  }
}

export default new MetricsService();
