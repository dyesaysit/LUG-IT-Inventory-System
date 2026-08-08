import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  AssignTicketInputSchema,
  CompleteTicketInputSchema,
  ConvertTicketInputSchema,
  CreateTicketInputSchema,
  TicketListQuerySchema,
} from 'shared';
import type { TicketController } from '../controllers/TicketController';
import { requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';

const parseId = (value: string): number | null => (/^\d+$/.test(value) ? Number(value) : null);

/** Routes for the Ticket Management module. */
export function createTicketRouter(controller: TicketController, authService: AuthService): Router {
  const router = Router();
  router.use(requireAuthentication(authService));

  router.get('/', requirePermission('tickets.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await controller.list(TicketListQuerySchema.parse(req.query)));
    } catch (error) {
      next(error);
    }
  });

  router.get('/summary', requirePermission('tickets.view'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await controller.summary());
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', requirePermission('tickets.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(String(req.params.id));
      if (!id) {
        res.status(400).json({ success: false, error: 'Invalid ticket ID' });
        return;
      }
      res.json(await controller.get(id));
    } catch (error) {
      next(error);
    }
  });

  router.post('/', requirePermission('tickets.create'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await controller.create(CreateTicketInputSchema.parse(req.body), req.auth!.userId, null));
    } catch (error) {
      next(error);
    }
  });

  const withId = (
    permission: string,
    handler: (id: number, req: Request) => Promise<unknown>,
  ) =>
    [
      requirePermission(permission),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const id = parseId(String(req.params.id));
          if (!id) {
            res.status(400).json({ success: false, error: 'Invalid ticket ID' });
            return;
          }
          res.json(await handler(id, req));
        } catch (error) {
          next(error);
        }
      },
    ] as const;

  router.post('/:id/assign', ...withId('tickets.update', (id, req) => controller.assign(id, AssignTicketInputSchema.parse(req.body))));
  router.post('/:id/start', ...withId('tickets.update', (id) => controller.start(id)));
  router.post('/:id/convert', ...withId('tickets.update', (id, req) => controller.convert(id, ConvertTicketInputSchema.parse(req.body))));
  router.post('/:id/complete', ...withId('tickets.update', (id, req) => controller.complete(id, CompleteTicketInputSchema.parse(req.body))));
  router.post('/:id/close', ...withId('tickets.close', (id) => controller.close(id)));
  router.post('/:id/cancel', ...withId('tickets.update', (id) => controller.cancel(id)));

  return router;
}
