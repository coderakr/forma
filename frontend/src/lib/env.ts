import { z } from 'zod';
const schema = z.object({
  VITE_API_URL: z.url().refine((v) => {
    const u = new URL(v);
    return ['http:', 'https:'].includes(u.protocol) && u.origin === v;
  }, 'Use an HTTP(S) origin, without a trailing slash'),
  VITE_DEV_PORT: z.coerce.number().int().min(1).max(65535),
  VITE_HERO_IMAGE_URL: z.url(),
});
export function parseEnv(input: unknown) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new Error(
      `Invalid frontend environment:\n${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')}`,
    );
  return result.data;
}
// The Vite config also validates the environment before serving or building.
export const env = import.meta.env ? parseEnv(import.meta.env) : undefined;
