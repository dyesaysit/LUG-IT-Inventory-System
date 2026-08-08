import { Router } from 'express';
import type { Request, Response } from 'express';
import { AuditLogQuerySchema } from 'shared';
import type { AuditController } from '../controllers/AuditController';
import { requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';

type IdParams = { id: string };
type EntityParams = { entity: string; id: string };
const parseId = (value: string) => /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null;
const invalidId = (res: Response) => res.status(400).json({ success: false, error: 'Invalid ID' });

/** Creates authenticated, permission-protected audit routes. */
export function createAuditRouter(controller: AuditController, authService: AuthService) {
  const router = Router();
  router.use(requireAuthentication(authService));
  router.use(requirePermission('audit.view'));
  router.get('/', async (req, res, next) => { try { res.json(await controller.list(AuditLogQuerySchema.parse(req.query))); } catch (error) { next(error); } });
  router.get('/summary', async (_req, res, next) => { try { res.json(await controller.summary()); } catch (error) { next(error); } });
  router.get('/entity/:entity/:id', async (req: Request<EntityParams>, res, next) => { try { const id = parseId(req.params.id); if (!id) { invalidId(res); return; } res.json(await controller.entity(req.params.entity, id)); } catch (error) { next(error); } });
  router.get('/:id', async (req: Request<IdParams>, res, next) => { try { const id = parseId(req.params.id); if (!id) { invalidId(res); return; } res.json(await controller.get(id)); } catch (error) { next(error); } });
  return router;
}
