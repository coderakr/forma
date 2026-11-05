import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { authMongo } from '../config/database.js';
import { env, trustedOrigins } from '../config/env.js';
export const auth = betterAuth({
  appName: 'Forma',
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(authMongo.db(), { client: authMongo }),
  trustedOrigins,
  emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128 },
  user: {
    additionalFields: {
      role: { type: 'string', required: true, defaultValue: 'user', input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, storage: 'database', window: 60, max: 30 },
  advanced: {
    ipAddress: { ipAddressHeaders: ['x-forma-client-ip'] },
    useSecureCookies: env.NODE_ENV === 'production' || env.COOKIE_SAME_SITE === 'none',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: env.COOKIE_SAME_SITE,
      secure: env.NODE_ENV === 'production' || env.COOKIE_SAME_SITE === 'none',
    },
    crossSubDomainCookies: {
      enabled: Boolean(env.COOKIE_DOMAIN),
      ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    },
  },
});
