import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AssetListQuerySchema } from 'shared';
import type { IAssetController } from '../controllers/AssetController';
import { requireAuthentication, requirePermission } from '../middleware/auth';
import type { AuthService } from '../services/AuthService';

type AssetIdParams = {
  id: string;
};

const parseAssetId = (id: string): number | null => {
  if (!/^\d+$/.test(id)) {
    return null;
  }

  const assetId = Number(id);
  return Number.isSafeInteger(assetId) ? assetId : null;
};

/**
 * Creates and returns a router for the asset endpoints.
 *
 * @returns An Express router with the asset routes mounted.
 */
export function createAssetRouter(assetController: IAssetController, authService: AuthService): Router {
  const router = Router();
  router.use(requireAuthentication(authService));

  router.get('/', requirePermission('assets.view'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = AssetListQuerySchema.parse(req.query);
      const assets = await assetController.getAssets(query);
      res.json(assets);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', requirePermission('assets.view'), async (req: Request<AssetIdParams>, res: Response, next: NextFunction) => {
    try {
      const id = parseAssetId(req.params.id);
      if (id === null) {
        res.status(400).json({ success: false, error: 'Invalid asset ID' });
        return;
      }

      const asset = await assetController.getAssetById(id);
      if (!asset) {
        res.status(404).json({ success: false, error: 'Asset not found' });
        return;
      }
      res.json(asset);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', requirePermission('assets.create'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = req.body;
      const createdAsset = await assetController.createAsset(asset);
      res.json(createdAsset);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', requirePermission('assets.update'), async (req: Request<AssetIdParams>, res: Response, next: NextFunction) => {
    try {
      const id = parseAssetId(req.params.id);
      if (id === null) {
        res.status(400).json({ success: false, error: 'Invalid asset ID' });
        return;
      }

      const asset = req.body;
      const updatedAsset = await assetController.updateAsset(id, asset);
      res.json(updatedAsset);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', requirePermission('assets.archive'), async (req: Request<AssetIdParams>, res: Response, next: NextFunction) => {
    try {
      const id = parseAssetId(req.params.id);
      if (id === null) {
        res.status(400).json({ success: false, error: 'Invalid asset ID' });
        return;
      }

      await assetController.archiveAsset(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

/**
 * Creates and returns a router for asset category endpoints.
 *
 * @param assetController - Shared asset controller instance.
 * @returns An Express router with the asset category routes mounted.
 */
export function createAssetCategoryRouter(assetController: IAssetController, authService: AuthService): Router {
  const router = Router();
  router.use(requireAuthentication(authService));

  router.get('/', requirePermission('assets.view'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await assetController.listCategories();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', requirePermission('settings.categories'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = await assetController.createCategory(req.body);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', requirePermission('settings.categories'), async (req: Request<AssetIdParams>, res: Response, next: NextFunction) => {
    try {
      const id = parseAssetId(req.params.id);
      if (id === null) {
        res.status(400).json({ success: false, error: 'Invalid category ID' });
        return;
      }
      const updated = await assetController.updateCategory(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/deactivate', requirePermission('settings.categories'), async (req: Request<AssetIdParams>, res: Response, next: NextFunction) => {
    try {
      const id = parseAssetId(req.params.id);
      if (id === null) {
        res.status(400).json({ success: false, error: 'Invalid category ID' });
        return;
      }
      const updated = await assetController.deactivateCategory(id);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/activate', requirePermission('settings.categories'), async (req: Request<AssetIdParams>, res: Response, next: NextFunction) => {
    try {
      const id = parseAssetId(req.params.id);
      if (id === null) {
        res.status(400).json({ success: false, error: 'Invalid category ID' });
        return;
      }
      const updated = await assetController.activateCategory(id);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
