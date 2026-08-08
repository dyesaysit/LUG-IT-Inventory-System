import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { DepartmentListQuerySchema } from 'shared';
import type { DepartmentController } from '../controllers/DepartmentController';
import { requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';

const parseId = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/** Creates the REST router for Departments. */
export function createDepartmentRouter(controller: DepartmentController, authService: AuthService): Router {
  const router = Router();
  router.use(requireAuthentication(authService));

  router.get('/', requirePermission('departments.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = DepartmentListQuerySchema.parse(req.query);
      res.json(await controller.list(query));
    } catch (error) { next(error); }
  });

  router.get('/:id', requirePermission('departments.view'), async (
    req: Request, res: Response, next: NextFunction,
  ) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) { res.status(400).json({ success: false, error: 'Invalid department ID' }); return; }
      res.json(await controller.getById(id));
    } catch (error) { next(error); }
  });

  router.post('/', requirePermission('departments.create'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await controller.create(req.body));
    } catch (error) { next(error); }
  });

  router.patch('/:id', requirePermission('departments.update'), async (
    req: Request, res: Response, next: NextFunction,
  ) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) { res.status(400).json({ success: false, error: 'Invalid department ID' }); return; }
      res.json(await controller.update(id, req.body));
    } catch (error) { next(error); }
  });

  router.delete('/:id', requirePermission('departments.archive'), async (
    req: Request, res: Response, next: NextFunction,
  ) => {
    try {
      const id = parseId(req.params.id);
      if (id === null) { res.status(400).json({ success: false, error: 'Invalid department ID' }); return; }
      await controller.archive(id);
      res.status(204).send();
    } catch (error) { next(error); }
  });

  return router;
}
