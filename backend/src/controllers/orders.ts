import type { RequestHandler } from 'express';
import { z } from 'zod';
import { Order } from '../models/index.js';
import { pageQuery, idParams, addressInput } from '../lib/validation.js';
import { notFound } from '../utils/errors.js';
import { placeOrder } from '../services/orders.js';
export const createOrder: RequestHandler = async (req, res) => {
  const key = z
    .uuid('A UUID Idempotency-Key header is required')
    .parse(req.headers['idempotency-key']);
  const input = z
    .object({
      address: addressInput,
      paymentMethod: z.literal('cod'),
      expectedTotal: z.number().int().positive(),
    })
    .strict()
    .parse(req.body);
  res.status(201).json(await placeOrder(req.user.id, key, input));
};
export const listOrders: RequestHandler = async (req, res) => {
  const { page, limit } = pageQuery.strict().parse(req.query);
  const filter = { userId: req.user.id };
  const [items, total] = await Promise.all([
    Order.find(filter)
      .select('-idempotencyKey -requestHash')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
};
export const orderDetail: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  const order = await Order.findOne({ _id: id, userId: req.user.id })
    .select('-idempotencyKey -requestHash')
    .lean();
  if (!order) notFound('Order');
  res.json(order);
};
