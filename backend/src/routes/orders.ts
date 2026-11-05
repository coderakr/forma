import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createOrder, listOrders, orderDetail } from '../controllers/orders.js';
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../controllers/addresses.js';
export const orderRoutes = Router();
orderRoutes.use(requireAuth);
orderRoutes.post('/orders', createOrder);
orderRoutes.get('/orders', listOrders);
orderRoutes.get('/orders/:id', orderDetail);
orderRoutes.get('/addresses', listAddresses);
orderRoutes.post('/addresses', createAddress);
orderRoutes.put('/addresses/:id', updateAddress);
orderRoutes.delete('/addresses/:id', deleteAddress);
