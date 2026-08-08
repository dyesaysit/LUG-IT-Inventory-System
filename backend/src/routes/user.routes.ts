import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { CreateUserInputSchema, ResetPasswordInputSchema, UpdateUserInputSchema, UserListQuerySchema } from 'shared';
import type { UserController } from '../controllers/UserController';
import { requireAnyPermission, requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';

const parseId = (value: unknown): number | null =>
  typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : null;

export function createUserRouter(controller: UserController, authService: AuthService) {
  const router = Router();
  const mutationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 80,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many user management requests. Please try again later.' },
  });

  router.use(requireAuthentication(authService));

  router.get('/', requirePermission('users.view'), async (req, res, next) => {
    try {
      res.json(await controller.list(UserListQuerySchema.parse(req.query)));
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', requirePermission('users.view'), async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) {
        res.status(400).json({ success: false, error: 'Invalid user ID' });
        return;
      }
      res.json(await controller.getById(id));
    } catch (error) {
      next(error);
    }
  });

  router.post('/', mutationLimiter, requirePermission('users.create'), async (req, res, next) => {
    try {
      res.status(201).json(await controller.create(CreateUserInputSchema.parse(req.body), req.auth!.userId));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', mutationLimiter, requirePermission('users.update'), async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) {
        res.status(400).json({ success: false, error: 'Invalid user ID' });
        return;
      }
      res.json(await controller.update(id, UpdateUserInputSchema.parse(req.body), req.auth!.userId));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/deactivate', mutationLimiter, requirePermission('users.deactivate'), async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) {
        res.status(400).json({ success: false, error: 'Invalid user ID' });
        return;
      }
      await controller.deactivate(id, req.auth!.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/reactivate', mutationLimiter, requirePermission('users.deactivate'), async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) {
        res.status(400).json({ success: false, error: 'Invalid user ID' });
        return;
      }
      await controller.reactivate(id, req.auth!.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/reset-password', mutationLimiter, requirePermission('users.reset_password'), async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) {
        res.status(400).json({ success: false, error: 'Invalid user ID' });
        return;
      }
      await controller.resetPassword(id, ResetPasswordInputSchema.parse(req.body), req.auth!.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/unlock', mutationLimiter, requirePermission('users.update'), async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) {
        res.status(400).json({ success: false, error: 'Invalid user ID' });
        return;
      }
      res.json(await controller.unlock(id, req.auth!.userId));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/revoke-sessions', mutationLimiter, requireAnyPermission('users.reset_password', 'users.deactivate'), async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      if (!id) {
        res.status(400).json({ success: false, error: 'Invalid user ID' });
        return;
      }
      await controller.revokeSessions(id, req.auth!.userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createRolePermissionRouter(controller: UserController, authService: AuthService) {
  const router = Router();
  router.use(requireAuthentication(authService));

  router.get('/roles', requirePermission('roles.view'), async (_req, res, next) => {
    try {
      res.json(await controller.listRoles());
    } catch (error) {
      next(error);
    }
  });

  router.get('/permissions', requirePermission('roles.view'), async (_req, res, next) => {
    try {
      res.json(await controller.listPermissions());
    } catch (error) {
      next(error);
    }
  });

  return router;
}
