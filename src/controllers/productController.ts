import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler';
import productService from '../services/productService';

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    cursor,
    limit,
    sortBy,
    sortOrder,
    category,
    minPrice,
    maxPrice,
    search,
  } = req.query;

  const result = await productService.getProducts({
    cursor: cursor as string,
    limit: limit ? parseInt(limit as string) : undefined,
    sortBy: sortBy as 'price' | 'createdAt' | 'name',
    sortOrder: sortOrder as 'asc' | 'desc',
    filters: {
      category: category as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      search: search as string,
    },
  });

  res.json({
    status: 'success',
    ...result,
  });
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    res.status(400).json({
      status: 'error',
      message: 'Product ID is required',
    });
    return;
  }

  const product = await productService.getProductById(id);

  if (!product) {
    res.status(404).json({
      status: 'error',
      message: 'Product not found',
    });
    return;
  }

  res.json({
    status: 'success',
    data: product,
  });
});
