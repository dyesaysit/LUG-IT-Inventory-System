import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import type { InitialSetupController } from '../controllers/InitialSetupController';

const requireLoopback = (req: Request, res: Response, next: NextFunction): void => {
  const address = req.socket.remoteAddress;
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') {
    res.status(403).json({ success: false, error: 'Initial setup must be completed on the server.' });
    return;
  }
  next();
};

/** Creates routes for one-time administrator setup. */
export function createInitialSetupRouter(controller: InitialSetupController): Router {
  const router = Router();
  const setupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many setup attempts. Please try again later.' },
  });
  router.get('/', controller.status);
  router.post('/', requireLoopback, setupLimiter, controller.complete);
  return router;
}
