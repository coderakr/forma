import type { RequestHandler } from 'express';
import { z } from 'zod';
import { Address } from '../models/index.js';
import { idParams, addressInput } from '../lib/validation.js';
import { AppError, notFound } from '../utils/errors.js';
export const listAddresses: RequestHandler = async (req, res) => {
  z.object({}).strict().parse(req.query);
  res.json(await Address.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50).lean());
};
export const createAddress: RequestHandler = async (req, res) => {
  const input = addressInput.parse(req.body);
  if ((await Address.countDocuments({ userId: req.user.id })) >= 50)
    throw new AppError(400, 'ADDRESS_LIMIT', 'Please remove an address before adding another');
  res.status(201).json(await Address.create({ ...input, userId: req.user.id }));
};
export const updateAddress: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  const input = addressInput.parse(req.body);
  const address = await Address.findOneAndUpdate(
    { _id: id, userId: req.user.id },
    { $set: input },
    { returnDocument: 'after', runValidators: true },
  );
  if (!address) notFound('Address');
  res.json(address);
};
export const deleteAddress: RequestHandler = async (req, res) => {
  const { id } = idParams.parse(req.params);
  const address = await Address.findOneAndDelete({ _id: id, userId: req.user.id });
  if (!address) notFound('Address');
  res.json({ deleted: true });
};
