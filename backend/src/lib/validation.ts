import { z } from 'zod';
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
export const idParams = z.object({ id: objectId }).strict();
export const slug = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});
export const addressInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d ()-]{8,20}$/, 'Enter a valid phone number'),
    line1: z.string().trim().min(5).max(160),
    line2: z.string().trim().max(160).default(''),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    postalCode: z.string().regex(/^\d{6}$/, 'Enter a 6-digit Indian PIN code'),
    country: z.literal('IN'),
  })
  .strict();
export const productInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug,
    description: z.string().trim().min(20).max(5000),
    category: slug,
    price: z.number().int().min(1).max(100000000),
    compareAtPrice: z.number().int().min(0).max(100000000).default(0),
    stock: z.number().int().min(0).max(100000),
    images: z
      .array(z.url().refine((v) => ['https:', 'http:'].includes(new URL(v).protocol)))
      .min(1)
      .max(8),
    variants: z
      .array(z.string().trim().min(1).max(40))
      .min(1)
      .max(12)
      .refine((v) => new Set(v).size === v.length, 'Options must be unique'),
    material: z.string().max(200).default(''),
    dimensions: z.string().max(200).default(''),
    featured: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .strict()
  .refine(
    (v) => !v.compareAtPrice || v.compareAtPrice > v.price,
    'Compare-at price must exceed the price',
  );
export const categoryInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    slug,
    description: z.string().max(250),
    image: z.url().refine((v) => ['https:', 'http:'].includes(new URL(v).protocol)),
  })
  .strict();
