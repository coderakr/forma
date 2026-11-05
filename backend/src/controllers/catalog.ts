import type { RequestHandler } from 'express';
import type { QueryFilter } from 'mongoose';
import { z } from 'zod';
import { Product, Category, Review, Order } from '../models/index.js';
import { pageQuery, slug, idParams } from '../lib/validation.js';
import { AppError, notFound } from '../utils/errors.js';
import mongoose from 'mongoose';
const listQuery = pageQuery
  .extend({
    q: z.string().trim().max(100).optional(),
    category: slug.optional(),
    sort: z.enum(['featured', 'newest', 'price-asc', 'price-desc', 'rating']).default('featured'),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    featured: z.enum(['true', 'false']).optional(),
    deal: z.enum(['true', 'false']).optional(),
    inStock: z.enum(['true', 'false']).optional(),
  })
  .strict();
export const listProducts: RequestHandler = async (req, res) => {
  const q = listQuery.parse(req.query);
  const filter: QueryFilter<InstanceType<typeof Product>> = { active: true };
  if (q.category) filter.category = q.category;
  if (q.q) filter.name = { $regex: q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (q.featured) filter.featured = q.featured === 'true';
  if (q.deal === 'true') filter.$expr = { $gt: ['$compareAtPrice', '$price'] };
  if (q.inStock === 'true') filter.stock = { $gt: 0 };
  if (q.minPrice !== undefined || q.maxPrice !== undefined)
    filter.price = {
      ...(q.minPrice !== undefined ? { $gte: q.minPrice } : {}),
      ...(q.maxPrice !== undefined ? { $lte: q.maxPrice } : {}),
    };
  const sorts: Record<typeof q.sort, Record<string, 1 | -1>> = {
    featured: { featured: -1, createdAt: -1, _id: -1 },
    newest: { createdAt: -1, _id: -1 },
    'price-asc': { price: 1, _id: 1 },
    'price-desc': { price: -1, _id: -1 },
    rating: { rating: -1, _id: -1 },
  };
  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(sorts[q.sort])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
};
export const productDetail: RequestHandler = async (req, res) => {
  const params = z.object({ slug }).strict().parse(req.params);
  const product = await Product.findOne({ slug: params.slug, active: true }).lean();
  if (!product) notFound('Product');
  res.json(product);
};
export const listCategories: RequestHandler = async (req, res) => {
  z.object({}).strict().parse(req.query);
  res.json(await Category.find().sort({ name: 1 }).lean());
};
export const listReviews: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  const { page, limit } = pageQuery.strict().parse(req.query);
  const [items, total] = await Promise.all([
    Review.find({ productId: id })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments({ productId: id }),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
};
export const createReview: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  const input = z
    .object({
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().min(3).max(100),
      body: z.string().trim().min(10).max(2000),
    })
    .strict()
    .parse(req.body);
  const purchased = await Order.exists({
    userId: req.user.id,
    'items.productId': id,
    status: 'delivered',
  });
  if (!purchased)
    throw new AppError(
      403,
      'PURCHASE_REQUIRED',
      'You can review this piece after your order is delivered',
    );
  await mongoose.connection.transaction(async (session) => {
    if (!(await Product.exists({ _id: id, active: true }).session(session))) notFound('Product');
    await Review.create(
      [{ ...input, productId: id, userId: req.user.id, author: req.user.name, verified: true }],
      { session },
    );
    const stats = await Review.aggregate<{ average: number; count: number }>([
      { $match: { productId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]).session(session);
    await Product.updateOne(
      { _id: id },
      { $set: { rating: stats[0]?.average ?? 0, reviewCount: stats[0]?.count ?? 0 } },
      { session },
    );
  });
  res.status(201).json({ message: 'Thank you for sharing your thoughts' });
};
