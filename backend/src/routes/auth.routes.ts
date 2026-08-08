import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ChangePasswordInputSchema, LoginInputSchema } from 'shared';
import type { AuthController } from '../controllers/AuthController';
import { SESSION_COOKIE_NAME } from '../auth/constants';
import { requireAuthentication } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';

export function createAuthRouter(controller: AuthController, authService: AuthService, isProduction: boolean) {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many login attempts. Please try again later.' },
  });

  const changePasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many password change attempts. Please try again later.' },
  });

  router.post('/login', loginLimiter, async (req, res, next) => {
    try {
      const result = await controller.login(LoginInputSchema.parse(req.body), req);
      res.cookie(SESSION_COOKIE_NAME, result.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        expires: result.expiresAt,
      });
      res.json({ user: result.user, permissions: result.permissions });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', requireAuthentication(authService), async (req, res, next) => {
    try {
      await controller.logout(req.cookies?.[SESSION_COOKIE_NAME] as string | undefined);
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/', sameSite: 'lax', secure: isProduction });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout-all', requireAuthentication(authService), async (req, res, next) => {
    try {
      await controller.logoutAll(req.auth!.userId);
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/', sameSite: 'lax', secure: isProduction });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', requireAuthentication(authService), async (req, res, next) => {
    try {
      res.json(await controller.me(req.auth!.userId));
    } catch (error) {
      next(error);
    }
  });

  router.post('/change-password', requireAuthentication(authService), changePasswordLimiter, async (req, res, next) => {
    try {
      await controller.changePassword(req.auth!.userId, ChangePasswordInputSchema.parse(req.body));
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/', sameSite: 'lax', secure: isProduction });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
