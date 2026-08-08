import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { CreateEquipmentRequestInputSchema, ReportProblemInputSchema } from 'shared';
import type { PortalController } from '../controllers/PortalController';
import { requireAuthentication } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';

const parseId = (value: string): number | null => (/^\d+$/.test(value) ? Number(value) : null);

/**
 * Staff Portal routes. Authentication is required, but no module permission —
 * every endpoint is scoped to the signed-in user, so any staff account can use it.
 */
export function createPortalRouter(controller: PortalController, authService: AuthService): Router {
  const router = Router();
  router.use(requireAuthentication(authService));

  router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await controller.profile(req.auth!.userId));
    } catch (error) {
      next(error);
    }
  });

  router.get('/assets', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await controller.assets(req.auth!.userId));
    } catch (error) {
      next(error);
    }
  });

  router.post('/problems', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await controller.reportProblem(req.auth!.userId, ReportProblemInputSchema.parse(req.body)));
    } catch (error) {
      next(error);
    }
  });

  router.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await controller.requests(req.auth!.userId));
    } catch (error) {
      next(error);
    }
  });

  router.post('/requests', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res
        .status(201)
        .json(await controller.createRequest(req.auth!.userId, CreateEquipmentRequestInputSchema.parse(req.body)));
    } catch (error) {
      next(error);
    }
  });

  router.post('/requests/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(String(req.params.id));
      if (!id) {
        res.status(400).json({ success: false, error: 'Invalid request ID' });
        return;
      }
      res.json(await controller.cancelRequest(req.auth!.userId, id));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
