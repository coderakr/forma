import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import mongoose from 'mongoose';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { logger } from './lib/logger.js';
import { env, trustedOrigins } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { requireAuth } from './middleware/auth.js';
import { AppError } from './utils/errors.js';
import { adminRoutes } from './routes/admin.js';
import { orderRoutes } from './routes/orders.js';
import { cartRoutes } from './routes/cart.js';
import { catalogRoutes } from './routes/catalog.js';
export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || trustedOrigins.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Idempotency-Key'],
  }),
);
app.use(compression());
app.get('/health', (_req, res) =>
  res
    .status(mongoose.connection.readyState === 1 ? 200 : 503)
    .json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable' }),
);
const limitMessage = {
  error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' },
};
app.use(
  '/api',
  rateLimit({
    windowMs: 60_000,
    limit: 240,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: limitMessage,
  }),
);
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: limitMessage,
  }),
);
// Always overwrite this private header from Express's proxy-aware, validated client IP.
app.use('/api/auth', (req, _res, next) => {
  req.headers['x-forma-client-ip'] = req.ip ?? req.socket.remoteAddress ?? '';
  next();
});
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json({ limit: '100kb' }));
// CORS alone does not prevent CSRF. Require a trusted browser Origin on all store mutations.
app.use('/api', (req, _res, next) => {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    (!req.headers.origin || !trustedOrigins.includes(req.headers.origin))
  )
    throw new AppError(403, 'UNTRUSTED_ORIGIN', 'Request origin is not allowed');
  next();
});
app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));
app.get('/api/config', (_req, res) =>
  res.json({
    currency: env.CURRENCY,
    shippingFee: env.SHIPPING_FEE,
    freeShippingThreshold: env.FREE_SHIPPING_THRESHOLD,
  }),
);
app.use('/api', catalogRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', orderRoutes);
app.use((_req, _res) => {
  throw new AppError(404, 'NOT_FOUND', 'Endpoint not found');
});
app.use(errorHandler);
