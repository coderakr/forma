import 'dotenv/config';
import { z } from 'zod';

const origin = z.url().refine((value) => {
  const u = new URL(value);
  return ['http:', 'https:'].includes(u.protocol) && u.origin === value;
}, 'Use an HTTP(S) origin without a trailing slash or path');
const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    HOST: z.string().min(1),
    PORT: z.coerce.number().int().min(1).max(65535),
    MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .refine((v) => !v.startsWith('replace-'), 'Generate a real random secret'),
    BETTER_AUTH_URL: origin,
    HEARTBEAT_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    FRONTEND_URL: origin,
    TRUSTED_ORIGINS: z
      .string()
      .default('')
      .transform((v) =>
        v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      )
      .pipe(z.array(origin)),
    COOKIE_SAME_SITE: z.enum(['lax', 'none', 'strict']).default('lax'),
    COOKIE_DOMAIN: z.string().default(''),
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    CURRENCY: z.string().regex(/^[A-Z]{3}$/),
    SHIPPING_FEE: z.coerce.number().int().nonnegative(),
    FREE_SHIPPING_THRESHOLD: z.coerce.number().int().positive(),
  })
  .superRefine((v, ctx) => {
    if (
      (v.NODE_ENV === 'production' || v.COOKIE_SAME_SITE === 'none') &&
      (!v.BETTER_AUTH_URL.startsWith('https:') || !v.FRONTEND_URL.startsWith('https:'))
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Production and SameSite=None require HTTPS on both public origins',
      });
    if (
      v.COOKIE_DOMAIN &&
      ![v.BETTER_AUTH_URL, v.FRONTEND_URL].every((url) => {
        const host = new URL(url).hostname;
        return host === v.COOKIE_DOMAIN || host.endsWith(`.${v.COOKIE_DOMAIN}`);
      })
    )
      ctx.addIssue({
        code: 'custom',
        message: 'COOKIE_DOMAIN must be a shared parent of both origins',
      });
  });
const result = schema.safeParse(process.env);
if (!result.success)
  throw new Error(
    `Invalid backend environment:\n${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')}`,
  );
export const env = result.data;
export const trustedOrigins = [...new Set([env.FRONTEND_URL, ...env.TRUSTED_ORIGINS])];
export function parseSeedEnv() {
  const seed = z
    .object({
      SEED_ADMIN_EMAIL: z.email(),
      SEED_ADMIN_PASSWORD: z
        .string()
        .min(16)
        .refine((v) => !v.startsWith('replace-'), 'Set a strong admin password'),
      IMAGE_BASE_URL: z.url(),
    })
    .safeParse(process.env);
  if (!seed.success) throw new Error(`Invalid seed environment: ${seed.error.message}`);
  return seed.data;
}
