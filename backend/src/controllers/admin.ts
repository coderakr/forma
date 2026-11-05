import type { RequestHandler } from 'express';
import { z } from 'zod';
import { Product, Category, Order } from '../models/index.js';
import { productInput, categoryInput, idParams, pageQuery } from '../lib/validation.js';
import { AppError, notFound } from '../utils/errors.js';
import { changeOrderStatus } from '../services/orders.js';
export const stats: RequestHandler = async (req, res) => {
  z.object({}).strict().parse(req.query);
  const [products, orders, lowStock, sales] = await Promise.all([
    Product.countDocuments({ active: true }),
    Order.countDocuments(),
    Product.countDocuments({ active: true, stock: { $lt: 5 } }),
    Order.aggregate<{ revenue: number }>([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, revenue: { $sum: '$total' } } },
    ]),
  ]);
  res.json({ products, orders, lowStock, revenue: sales[0]?.revenue ?? 0 });
};
export const adminProducts: RequestHandler = async (req, res) => {
  const { page, limit } = pageQuery.strict().parse(req.query);
  const [items, total] = await Promise.all([
    Product.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
};
export const saveProduct: RequestHandler = async (req, res) => {
  const input = productInput.parse(req.body);
  if (!(await Category.exists({ slug: input.category })))
    throw new AppError(400, 'INVALID_CATEGORY', 'Choose an existing category');
  if (req.method === 'POST') {
    res.status(201).json(await Product.create(input));
    return;
  }
  const { id } = idParams.parse(req.params);
  const product = await Product.findByIdAndUpdate(
    id,
    { $set: input },
    { returnDocument: 'after', runValidators: true },
  );
  if (!product) notFound('Product');
  res.json(product);
};
export const archiveProduct: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  const product = await Product.findByIdAndUpdate(id, { $set: { active: false } });
  if (!product) notFound('Product');
  res.json({ archived: true });
};
export const saveCategory: RequestHandler = async (req, res) => {
  const input = categoryInput.parse(req.body);
  if (req.method === 'POST') {
    res.status(201).json(await Category.create(input));
    return;
  }
  const { id } = idParams.parse(req.params);
  const existing = await Category.findById(id);
  if (!existing) notFound('Category');
  if (existing.slug !== input.slug)
    throw new AppError(
      400,
      'IMMUTABLE_SLUG',
      'Category slug cannot change; it is referenced by products',
    );
  Object.assign(existing, input);
  await existing.save();
  res.json(existing);
};
export const deleteCategory: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  const category = await Category.findById(id);
  if (!category) notFound('Category');
  if (await Product.exists({ category: category.slug }))
    throw new AppError(
      409,
      'CATEGORY_IN_USE',
      'Move all products (including archived ones) before removing this category',
    );
  await category.deleteOne();
  res.json({ deleted: true });
};
export const adminOrders: RequestHandler = async (req, res) => {
  const { page, limit } = pageQuery.strict().parse(req.query);
  const [items, total] = await Promise.all([
    Order.find()
      .select('-idempotencyKey -requestHash')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
};
export const adminOrderDetail: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  const order = await Order.findById(id).select('-idempotencyKey -requestHash').lean();
  if (!order) notFound('Order');
  res.json(order);
};
export const updateOrder: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  const { status } = z
    .object({ status: z.enum(['placed', 'processing', 'shipped', 'delivered', 'cancelled']) })
    .strict()
    .parse(req.body);
  res.json(await changeOrderStatus(id, status));
};
