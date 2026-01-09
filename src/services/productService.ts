import prisma from '../config/database';
import redisClient from '../config/redis';
import metricsService from './metricsService';

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}

export interface ProductQuery {
  cursor?: string;
  limit?: number;
  sortBy?: 'price' | 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  filters?: ProductFilters;
}

export interface ProductResponse {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

class ProductService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;

  /**
   * Get products with cursor-based pagination, sorting, and filtering
   */
  async getProducts(query: ProductQuery): Promise<ProductResponse> {
    const limit = Math.min(query.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    // Generate cache key
    const cacheKey = this.generateCacheKey(query);

    // Check cache
    const startTime = Date.now();
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const responseTime = Date.now() - startTime;
      metricsService.recordProductQuery(true, responseTime);
      return JSON.parse(cached);
    }

    // Build where clause
    const where: any = {};

    if (query.filters?.category) {
      where.category = query.filters.category;
    }

    if (query.filters?.minPrice !== undefined || query.filters?.maxPrice !== undefined) {
      where.price = {};
      if (query.filters.minPrice !== undefined) {
        where.price.gte = query.filters.minPrice;
      }
      if (query.filters.maxPrice !== undefined) {
        where.price.lte = query.filters.maxPrice;
      }
    }

    if (query.filters?.search) {
      where.OR = [
        { name: { contains: query.filters.search } },
        { description: { contains: query.filters.search } },
      ];
    }

    // Cursor-based pagination
    const cursorCondition = query.cursor
      ? {
          id: {
            [sortOrder === 'asc' ? 'gt' : 'lt']: query.cursor,
          },
        }
      : {};

    const products = await prisma.product.findMany({
      where: { ...where, ...cursorCondition },
      take: limit + 1, // Fetch one extra to determine if there are more
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    const hasMore = products.length > limit;
    const data = hasMore ? products.slice(0, limit) : products;
    const lastItem = data[data.length - 1];
    const nextCursor = hasMore && lastItem ? (lastItem as any).id : null;

    const response: ProductResponse = {
      data,
      nextCursor,
      hasMore,
    };

    // Track metrics
    const responseTime = Date.now() - startTime;
    metricsService.recordProductQuery(false, responseTime);

    // Cache the result
    await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(response));

    return response;
  }

  /**
   * Get product by ID with caching
   */
  async getProductById(id: string): Promise<any> {
    const cacheKey = `product:${id}`;

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (product) {
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(product));
    }

    return product;
  }

  /**
   * Invalidate cache for product queries
   */
  async invalidateCache(pattern: string = 'products:*'): Promise<void> {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }

  /**
   * Generate cache key from query parameters
   */
  private generateCacheKey(query: ProductQuery): string {
    const parts = [
      'products',
      query.cursor || 'start',
      query.limit || this.DEFAULT_LIMIT,
      query.sortBy || 'createdAt',
      query.sortOrder || 'desc',
      query.filters?.category || 'all',
      query.filters?.minPrice || '0',
      query.filters?.maxPrice || 'max',
      query.filters?.search || 'none',
    ];
    return parts.join(':');
  }
}

export default new ProductService();
