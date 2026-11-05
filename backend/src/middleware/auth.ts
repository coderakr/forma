import type { RequestHandler } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { AppError } from '../utils/errors.js';
declare global {
  namespace Express {
    interface Request {
      user: typeof auth.$Infer.Session.user;
    }
  }
}
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue');
  req.user = session.user;
  next();
};
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user.role !== 'admin')
    throw new AppError(403, 'FORBIDDEN', 'Administrator access required');
  next();
};
