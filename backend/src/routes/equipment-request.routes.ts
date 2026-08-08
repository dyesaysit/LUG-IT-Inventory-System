import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  EquipmentRequestListQuerySchema,
  FulfilRequestInputSchema,
  ReviewRequestInputSchema,
} from 'shared';
import type { RequestReviewController } from '../controllers/RequestReviewController';
import { requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';
import type { Reviewer } from '../services/RequestReviewService';

const parseId = (value: string): number | null => (/^\d+$/.test(value) ? Number(value) : null);

const reviewerOf = (req: Request): Reviewer => ({ userId: req.auth!.userId, username: req.auth!.username });

/** Admin routes for reviewing and fulfilling staff equipment requests. */
export function createEquipmentRequestRouter(
  controller: RequestReviewController,
  authService: AuthService,
): Router {
  const router = Router();
  router.use(requireAuthentication(authService));

  router.get('/', requirePermission('requests.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await controller.list(EquipmentRequestListQuerySchema.parse(req.query)));
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', requirePermission('requests.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(String(req.params.id));
      if (!id) {
        res.status(400).json({ success: false, error: 'Invalid request ID' });
        return;
      }
      res.json(await controller.getById(id));
    } catch (error) {
      next(error);
    }
  });

  const withId = (permission: string, handler: (id: number, req: Request) => Promise<unknown>) =>
    [
      requirePermission(permission),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const id = parseId(String(req.params.id));
          if (!id) {
            res.status(400).json({ success: false, error: 'Invalid request ID' });
            return;
          }
          res.json(await handler(id, req));
        } catch (error) {
          next(error);
        }
      },
    ] as const;

  router.post(
    '/:id/approve',
    ...withId('requests.review', (id, req) =>
      controller.approve(id, ReviewRequestInputSchema.parse(req.body), reviewerOf(req)),
    ),
  );
  router.post(
    '/:id/reject',
    ...withId('requests.review', (id, req) =>
      controller.reject(id, ReviewRequestInputSchema.parse(req.body), reviewerOf(req)),
    ),
  );
  router.post(
    '/:id/request-info',
    ...withId('requests.review', (id, req) =>
      controller.requestMoreInformation(id, ReviewRequestInputSchema.parse(req.body), reviewerOf(req)),
    ),
  );
  router.post(
    '/:id/fulfil',
    ...withId('requests.fulfil', (id, req) =>
      controller.fulfil(id, FulfilRequestInputSchema.parse(req.body), reviewerOf(req)),
    ),
  );

  return router;
}
