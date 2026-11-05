import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { readCart, updateCart } from '../controllers/cart.js';
export const cartRoutes = Router();
cartRoutes.use(requireAuth);
cartRoutes.get('/', readCart);
cartRoutes.put('/items', updateCart);
