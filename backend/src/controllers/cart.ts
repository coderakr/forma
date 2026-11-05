import type { RequestHandler } from 'express';
import { z } from 'zod';
import { getCart, setCartItem } from '../services/cart.js';
import { objectId } from '../lib/validation.js';
export const readCart: RequestHandler = async (req, res) => {
  z.object({}).strict().parse(req.query);
  res.json(await getCart(req.user.id));
};
export const updateCart: RequestHandler = async (req, res) => {
  const input = z
    .object({
      productId: objectId,
      variant: z.string().min(1).max(40),
      quantity: z.number().int().min(0).max(20),
    })
    .strict()
    .parse(req.body);
  res.json(await setCartItem(req.user.id, input));
};
