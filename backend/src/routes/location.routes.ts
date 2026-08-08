import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { LocationListQuerySchema } from 'shared';
import type { LocationController } from '../controllers/LocationController';
import { requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';

const parseId = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/** Creates the REST router for Locations. */
export function createLocationRouter(controller: LocationController, authService: AuthService): Router {
  const router = Router();
  router.use(requireAuthentication(authService));
  router.get('/', requirePermission('locations.view'), async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await controller.list(LocationListQuerySchema.parse(req.query))); }
    catch (error) { next(error); }
  });
  router.get('/:id', requirePermission('locations.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) { res.status(400).json({ success: false, error: 'Invalid location ID' }); return; }
      res.json(await controller.get(id));
    } catch (error) { next(error); }
  });
  router.post('/', requirePermission('locations.create'), async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json(await controller.create(req.body)); }
    catch (error) { next(error); }
  });
  router.patch('/:id', requirePermission('locations.update'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) { res.status(400).json({ success: false, error: 'Invalid location ID' }); return; }
      res.json(await controller.update(id, req.body));
    } catch (error) { next(error); }
  });
  router.delete('/:id', requirePermission('locations.archive'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) { res.status(400).json({ success: false, error: 'Invalid location ID' }); return; }
      await controller.archive(id); res.status(204).send();
    } catch (error) { next(error); }
  });
  return router;
}
