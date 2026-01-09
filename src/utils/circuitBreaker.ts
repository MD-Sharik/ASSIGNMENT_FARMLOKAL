import CircuitBreaker from 'opossum';
import externalApiService from '../services/externalApiService';
import metricsService from '../services/metricsService';

// Circuit breaker for external API calls
const circuitBreakerOptions = {
  timeout: 10000, // 10 seconds
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000, // Try again after 30 seconds
};

export const externalApiCircuitBreaker = new CircuitBreaker(
  async () => externalApiService.fetchProductsFromApiA(),
  circuitBreakerOptions
);

// Event listeners for monitoring
externalApiCircuitBreaker.on('open', () => {
  console.warn('Circuit breaker opened - external API is failing');
  metricsService.setCircuitBreakerStatus('OPEN');
});

externalApiCircuitBreaker.on('halfOpen', () => {
  console.log('Circuit breaker half-open - testing external API');
  metricsService.setCircuitBreakerStatus('HALF_OPEN');
});

externalApiCircuitBreaker.on('close', () => {
  console.log('Circuit breaker closed - external API is healthy');
  metricsService.setCircuitBreakerStatus('CLOSED');
});
