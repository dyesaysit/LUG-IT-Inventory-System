import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AssetListQuerySchema } from 'shared';
import type { IAssetController } from '../controllers/AssetController';

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
export function createAssetRouter(assetController: IAssetController): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = AssetListQuerySchema.parse(req.query);
      const assets = await assetController.getAssets(query);
      res.json(assets);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req: Request<AssetIdParams>, res: Response, next: NextFunction) => {
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

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = req.body;
      const createdAsset = await assetController.createAsset(asset);
      res.json(createdAsset);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', async (req: Request<AssetIdParams>, res: Response, next: NextFunction) => {
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

  router.delete('/:id', async (req: Request<AssetIdParams>, res: Response, next: NextFunction) => {
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
export function createAssetCategoryRouter(assetController: IAssetController): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await assetController.listCategories();
      res.json(categories);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
