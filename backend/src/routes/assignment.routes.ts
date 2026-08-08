import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  AssignmentListQuerySchema, CreateAssignmentInputSchema,
  ReturnAssignmentInputSchema, UpdateAssignmentInputSchema,
} from 'shared';
import type { AssignmentController } from '../controllers/AssignmentController';
import { requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';

const parseId = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const id = Number(value); return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/** Creates assignment lifecycle routes. */
export function createAssignmentRouter(controller: AssignmentController, authService: AuthService): Router {
  const router = Router();
  router.use(requireAuthentication(authService));
  router.get('/', requirePermission('assignments.view'), async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await controller.list(AssignmentListQuerySchema.parse(req.query))); }
    catch (error) { next(error); }
  });
  router.get('/:id', requirePermission('assignments.view'), async (req: Request, res: Response, next: NextFunction) => {
    try { const id = parseId(req.params.id); if (!id) { res.status(400).json({ success: false, error: 'Invalid assignment ID' }); return; } res.json(await controller.getById(id)); }
    catch (error) { next(error); }
  });
  router.post('/', requirePermission('assignments.create'), async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json(await controller.create(CreateAssignmentInputSchema.parse(req.body))); }
    catch (error) { next(error); }
  });
  router.patch('/:id', requirePermission('assignments.update'), async (req: Request, res: Response, next: NextFunction) => {
    try { const id = parseId(req.params.id); if (!id) { res.status(400).json({ success: false, error: 'Invalid assignment ID' }); return; } res.json(await controller.update(id, UpdateAssignmentInputSchema.parse(req.body))); }
    catch (error) { next(error); }
  });
  router.post('/:id/return', requirePermission('assignments.return'), async (req: Request, res: Response, next: NextFunction) => {
    try { const id = parseId(req.params.id); if (!id) { res.status(400).json({ success: false, error: 'Invalid assignment ID' }); return; } res.json(await controller.returnAssignment(id, ReturnAssignmentInputSchema.parse(req.body))); }
    catch (error) { next(error); }
  });
  router.post('/:id/cancel', requirePermission('assignments.cancel'), async (req: Request, res: Response, next: NextFunction) => {
    try { const id = parseId(req.params.id); if (!id) { res.status(400).json({ success: false, error: 'Invalid assignment ID' }); return; } res.json(await controller.cancelAssignment(id)); }
    catch (error) { next(error); }
  });
  return router;
}

/** Creates the nested asset assignment-history route. */
export function createAssetAssignmentHistoryRouter(controller: AssignmentController, authService: AuthService): Router {
  const router = Router();
  router.use(requireAuthentication(authService));
  router.get('/:assetId/assignment-history', async (
    req: Request, res: Response, next: NextFunction,
  ) => {
    try { const id = parseId(req.params.assetId); if (!id) { res.status(400).json({ success: false, error: 'Invalid asset ID' }); return; } res.json(await controller.getAssetHistory(id)); }
    catch (error) { next(error); }
  });
  return router;
}
