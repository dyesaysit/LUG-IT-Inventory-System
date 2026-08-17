import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { ISettingsService } from '../services/SettingsService';

/**
 * Creates the router for public (unauthenticated) endpoints.
 * Currently exposes the public-settings endpoint for branding/white-label configuration.
 */
export function createPublicRouter(settingsService: ISettingsService): Router {
  const router = Router();

  router.get('/public-settings', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await settingsService.getPublicSettings();
      res.setHeader('Cache-Control', 'no-store');
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
