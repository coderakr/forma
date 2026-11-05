import mongoose from 'mongoose';
import { Cart, Product } from '../models/index.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
export function calculateTotals(subtotal: number) {
  const shipping = subtotal === 0 || subtotal >= env.FREE_SHIPPING_THRESHOLD ? 0 : env.SHIPPING_FEE;
  return { subtotal, shipping, total: subtotal + shipping, currency: env.CURRENCY };
}
export async function getCart(userId: string) {
  const cart = await Cart.findOne({ userId }).lean();
  const products = await Product.find({
    _id: { $in: cart?.items.map((i) => i.productId) ?? [] },
  }).lean();
  const items = (cart?.items ?? []).map((item) => ({
    productId: String(item.productId),
    variant: item.variant,
    quantity: item.quantity,
    product: products.find((p) => String(p._id) === String(item.productId)) ?? null,
  }));
  return {
    items,
    ...calculateTotals(
      items.reduce((total, item) => total + (item.product?.price ?? 0) * item.quantity, 0),
    ),
  };
}
export async function setCartItem(
  userId: string,
  input: { productId: string; variant: string; quantity: number },
) {
  // Create outside the transaction; the unique userId index makes first-use races safe.
  await Cart.updateOne({ userId }, { $setOnInsert: { userId, items: [] } }, { upsert: true });
  await mongoose.connection.transaction(async (session) => {
    const cart = await Cart.findOne({ userId }).session(session).orFail();
    const existing = cart.items.find(
      (i) => String(i.productId) === input.productId && i.variant === input.variant,
    );
    if (input.quantity === 0) {
      cart.items = cart.items.filter(
        (i) => !(String(i.productId) === input.productId && i.variant === input.variant),
      ) as typeof cart.items;
    } else {
      const product = await Product.findOne({ _id: input.productId, active: true }).session(
        session,
      );
      if (!product || !product.variants.includes(input.variant))
        throw new AppError(400, 'UNAVAILABLE', 'This product or finish is no longer available');
      const otherQuantity = cart.items
        .filter((i) => String(i.productId) === input.productId && i.variant !== input.variant)
        .reduce((sum, i) => sum + i.quantity, 0);
      if (product.stock < input.quantity + otherQuantity)
        throw new AppError(
          409,
          'OUT_OF_STOCK',
          `Only ${product.stock} of ${product.name} are available`,
        );
      if (existing) existing.quantity = input.quantity;
      else {
        if (cart.items.length >= 50)
          throw new AppError(400, 'CART_LIMIT', 'Your bag can hold up to 50 different pieces');
        cart.items.push({ ...input, productId: new mongoose.Types.ObjectId(input.productId) });
      }
    }
    cart.markModified('items');
    await cart.save({ session });
  });
  return getCart(userId);
}
