import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import type { z } from 'zod';
import { Cart, Order, Product } from '../models/index.js';
import type { addressInput } from '../lib/validation.js';
import { AppError } from '../utils/errors.js';
import { calculateTotals } from './cart.js';
import { paymentProvider } from './payments.js';
export async function placeOrder(
  userId: string,
  key: string,
  input: { address: z.infer<typeof addressInput>; expectedTotal: number; paymentMethod: 'cod' },
) {
  const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const lookup = { userId, idempotencyKey: key };
  const existing = await Order.findOne(lookup).lean();
  if (existing) {
    if (existing.requestHash !== requestHash)
      throw new AppError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'This checkout attempt was already used. Start a new checkout.',
      );
    return existing;
  }
  try {
    return await mongoose.connection.transaction(async (session) => {
      const previous = await Order.findOne(lookup).session(session).lean();
      if (previous) {
        if (previous.requestHash !== requestHash)
          throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'This checkout attempt was already used');
        return previous;
      }
      const cart = await Cart.findOne({ userId }).session(session);
      if (!cart?.items.length) throw new AppError(400, 'EMPTY_CART', 'Your bag is empty');
      const items = [];
      for (const line of cart.items) {
        // The conditional update and transaction prevent overselling across users or variants.
        const product = await Product.findOneAndUpdate(
          {
            _id: line.productId,
            active: true,
            variants: line.variant,
            stock: { $gte: line.quantity },
          },
          { $inc: { stock: -line.quantity } },
          { session, returnDocument: 'before' },
        );
        if (!product)
          throw new AppError(
            409,
            'OUT_OF_STOCK',
            'A piece in your bag is no longer available in the requested quantity. Please update your bag.',
          );
        items.push({
          productId: product._id,
          name: product.name,
          image: product.images[0]!,
          variant: line.variant,
          quantity: line.quantity,
          unitPrice: product.price,
        });
      }
      const totals = calculateTotals(items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));
      if (totals.total !== input.expectedTotal)
        throw new AppError(
          409,
          'PRICE_CHANGED',
          'Your bag prices changed. Please review the updated total before placing your order.',
        );
      const [order] = await Order.create(
        [
          {
            ...lookup,
            requestHash,
            items,
            address: input.address,
            ...totals,
            ...paymentProvider.prepare({ amount: totals.total, currency: totals.currency }),
          },
        ],
        { session },
      );
      cart.items.splice(0);
      cart.markModified('items');
      await cart.save({ session });
      return order!.toObject();
    });
  } catch (error) {
    // Concurrent retries with the same key converge to the committed order.
    if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
      const order = await Order.findOne(lookup).lean();
      if (order && order.requestHash === requestHash) return order;
    }
    throw error;
  }
}
export const transitions: Record<string, readonly string[]> = {
  placed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
export async function changeOrderStatus(id: string, status: string) {
  return mongoose.connection.transaction(async (session) => {
    const order = await Order.findById(id).session(session);
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
    if (order.status === status) return order;
    if (!transitions[order.status]?.includes(status))
      throw new AppError(409, 'INVALID_TRANSITION', `Cannot change ${order.status} to ${status}`);
    if (status === 'cancelled') {
      for (const item of order.items)
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: item.quantity } },
          { session },
        );
      order.paymentStatus = 'cancelled';
    }
    if (status === 'delivered' && order.paymentMethod === 'cod') order.paymentStatus = 'paid';
    order.status = status as typeof order.status;
    await order.save({ session });
    return order;
  });
}
