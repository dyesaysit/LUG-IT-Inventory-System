import type { NextFunction, Request, Response } from 'express';
import type { AuthService } from '../services/AuthService';
import { SESSION_COOKIE_NAME } from '../auth/constants';

const unauthorized = (res: Response) => {
  res.status(401).json({ success: false, error: 'Unauthorized' });
};

export const requireAuthentication = (authService: AuthService) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
      const context = await authService.authenticateSession(token);
      if (!context) {
        unauthorized(res);
        return;
      }
      req.auth = context.auth;
      next();
    } catch (error) {
      next(error);
    }
  };

export const optionalAuthentication = (authService: AuthService) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
      const context = await authService.authenticateSession(token);
      if (context) {
        req.auth = context.auth;
      }
      next();
    } catch (error) {
      next(error);
    }
  };

export const requirePermission = (permissionCode: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      unauthorized(res);
      return;
    }
    if (req.auth.mustChangePassword) {
      res.status(403).json({ success: false, error: 'Password change required' });
      return;
    }
    if (!req.auth.permissions.includes(permissionCode)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    next();
  };

export const requireAnyPermission = (...permissionCodes: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      unauthorized(res);
      return;
    }
    if (req.auth.mustChangePassword) {
      res.status(403).json({ success: false, error: 'Password change required' });
      return;
    }
    if (!permissionCodes.some((permissionCode) => req.auth?.permissions.includes(permissionCode))) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    next();
  };
