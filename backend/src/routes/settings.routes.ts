import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { BatchUpdateSettingsInputSchema, RestoreBackupInputSchema, UpdateSettingInputSchema } from 'shared';
import type { BackupController, SettingsController } from '../controllers/SettingsController';
import { requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';
import { settingsPermissionForCategory } from '../services/SettingsService';

const parseId = (value: string): number | null => {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/** Whether the authenticated caller can manage settings in at least one category. */
const canManageAnySettings = (permissions: string[]): boolean =>
  permissions.includes('settings.manage') || permissions.includes('settings.security') || permissions.includes('settings.reports');

/** Creates the router for the Settings module (settings, system info, database maintenance). */
export function createSettingsRouter(controller: SettingsController, authService: AuthService): Router {
  const router = Router();
  router.use(requireAuthentication(authService));

  router.get('/', requirePermission('settings.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await controller.getAll();
      const readOnly = !canManageAnySettings(req.auth?.permissions ?? []);
      res.json({ settings, readOnly });
    } catch (error) {
      next(error);
    }
  });

  router.get('/system-info', requirePermission('settings.view'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await controller.getSystemInformation());
    } catch (error) {
      next(error);
    }
  });

  router.get('/database/status', requirePermission('settings.database'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await controller.getDatabaseStatus());
    } catch (error) {
      next(error);
    }
  });

  router.post('/database/integrity-check', requirePermission('settings.database'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await controller.runIntegrityCheck());
    } catch (error) {
      next(error);
    }
  });

  router.post('/database/optimize', requirePermission('settings.database'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await controller.runOptimize());
    } catch (error) {
      next(error);
    }
  });

  router.post('/database/checkpoint', requirePermission('settings.database'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await controller.runCheckpoint());
    } catch (error) {
      next(error);
    }
  });

  router.patch('/', requirePermission('settings.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = BatchUpdateSettingsInputSchema.parse(req.body);
      const permissions = req.auth?.permissions ?? [];
      const missingPermission = input.updates.find(
        (update) => !permissions.includes(settingsPermissionForCategory(update.category)),
      );
      if (missingPermission) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }
      const updated = await controller.updateSettingsBatch(input, req.auth!.userId);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:category', requirePermission('settings.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = String(req.params.category);
      const settings = await controller.getByCategory(category);
      const readOnly = !(req.auth?.permissions ?? []).includes(settingsPermissionForCategory(category));
      res.json({ settings: { [category]: settings }, readOnly });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:category', requirePermission('settings.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = String(req.params.category);
      const requiredPermission = settingsPermissionForCategory(category);
      if (!req.auth?.permissions.includes(requiredPermission)) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }
      const input = BatchUpdateSettingsInputSchema.parse(req.body);
      const mismatched = input.updates.find((update) => update.category !== category);
      if (mismatched) {
        res.status(400).json({ success: false, error: `All updates must belong to category "${category}".` });
        return;
      }
      const updated = await controller.updateSettingsBatch(input, req.auth!.userId);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:category/:key', requirePermission('settings.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = String(req.params.category);
      const key = String(req.params.key);
      const requiredPermission = settingsPermissionForCategory(category);
      if (!req.auth?.permissions.includes(requiredPermission)) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
      }
      const input = UpdateSettingInputSchema.parse(req.body);
      const updated = await controller.updateSetting(category, key, input, req.auth!.userId);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

/** Creates the router for backup creation, listing, download, verification, and restore. Mounted at `/api/settings/backups`. */
export function createBackupRouter(controller: BackupController, authService: AuthService): Router {
  const router = Router();
  router.use(requireAuthentication(authService));

  router.get('/', requirePermission('settings.backup.view'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await controller.list());
    } catch (error) {
      next(error);
    }
  });

  router.post('/', requirePermission('settings.backup.create'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const backup = await controller.create(req.auth!.userId);
      res.status(201).json(backup);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', requirePermission('settings.backup.view'), async (req: Request, res: Response, next: NextFunction) => {
    try { const id=parseId(String(req.params.id)); if(id===null){res.status(400).json({success:false,error:'Invalid backup ID'});return;} res.json(await controller.get(id)); } catch(error){next(error);}
  });

  router.get('/:id/download', requirePermission('settings.backup.download'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(String(req.params.id));
      if (id === null) {
        res.status(400).json({ success: false, error: 'Invalid backup ID' });
        return;
      }
      const { filePath, filename } = await controller.getDownload(id);
      res.download(filePath, filename, { headers: { 'Content-Type': 'application/vnd.sqlite3' } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/verify', requirePermission('settings.backup.verify'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(String(req.params.id));
      if (id === null) {
        res.status(400).json({ success: false, error: 'Invalid backup ID' });
        return;
      }
      res.json(await controller.verify(id));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/restore', requirePermission('settings.backup.restore'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(String(req.params.id));
      if (id === null) {
        res.status(400).json({ success: false, error: 'Invalid backup ID' });
        return;
      }
      const input = RestoreBackupInputSchema.parse(req.body);
      res.json(await controller.restore(id, input, req.auth!.userId));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/archive', requirePermission('settings.backup.archive'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseId(String(req.params.id));
      if (id === null) {
        res.status(400).json({ success: false, error: 'Invalid backup ID' });
        return;
      }
      await controller.remove(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

