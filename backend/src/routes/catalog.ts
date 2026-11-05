import { Router } from 'express';
import {
  listProducts,
  productDetail,
  listCategories,
  listReviews,
  createReview,
} from '../controllers/catalog.js';
import { requireAuth } from '../middleware/auth.js';
export const catalogRoutes = Router();
catalogRoutes.get('/products', listProducts);
catalogRoutes.get('/products/:id/reviews', listReviews);
catalogRoutes.post('/products/:id/reviews', requireAuth, createReview);
catalogRoutes.get('/products/:slug', productDetail);
catalogRoutes.get('/categories', listCategories);
