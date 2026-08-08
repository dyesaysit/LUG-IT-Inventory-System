import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { PersonListQuerySchema } from 'shared';
import type { PersonController } from '../controllers/PersonController';
import { requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';

const parseId = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/** Creates the REST router for People. */
export function createPersonRouter(controller: PersonController, authService: AuthService): Router {
  const router = Router();
  router.use(requireAuthentication(authService));
  router.get('/', requirePermission('people.view'), async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await controller.list(PersonListQuerySchema.parse(req.query))); }
    catch (error) { next(error); }
  });
  router.get('/:id', requirePermission('people.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) { res.status(400).json({ success: false, error: 'Invalid person ID' }); return; }
      res.json(await controller.getById(id));
    } catch (error) { next(error); }
  });
  router.post('/', requirePermission('people.create'), async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json(await controller.create(req.body)); }
    catch (error) { next(error); }
  });
  router.patch('/:id', requirePermission('people.update'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) { res.status(400).json({ success: false, error: 'Invalid person ID' }); return; }
      res.json(await controller.update(id, req.body));
    } catch (error) { next(error); }
  });
  router.delete('/:id', requirePermission('people.archive'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) { res.status(400).json({ success: false, error: 'Invalid person ID' }); return; }
      await controller.archive(id);
      res.status(204).send();
    } catch (error) { next(error); }
  });
  return router;
}
