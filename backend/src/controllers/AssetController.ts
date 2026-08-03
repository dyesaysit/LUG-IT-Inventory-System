import { createAssetService } from '../services/AssetService';
import type { IAssetService } from '../services/AssetService';
import { CreateAssetInputSchema, UpdateAssetInputSchema } from 'shared';
import type {
  AssetListQuery,
  InventoryAsset as Asset,
  InventoryAssetCategory as AssetCategory,
  InventoryCreateAssetInput as CreateAssetInput,
  InventoryUpdateAssetInput as UpdateAssetInput,
} from 'shared';

/**
 * Asset controller interface.
 */
export interface IAssetController {
  getAssets(query: AssetListQuery): Promise<Asset[]>;
  getAssetById(id: number): Promise<Asset | null>;
  createAsset(asset: CreateAssetInput): Promise<Asset>;
  updateAsset(id: number, asset: UpdateAssetInput): Promise<Asset>;
  archiveAsset(id: number): Promise<void>;
  listCategories(): Promise<AssetCategory[]>;
}

/**
 * Asset controller implementation.
 */
export class AssetController implements IAssetController {
  constructor(private readonly service: IAssetService) {}

  async getAssets(query: AssetListQuery): Promise<Asset[]> {
    return this.service.listAssets(query);
  }

  async getAssetById(id: number): Promise<Asset | null> {
    return this.service.getAssetById(id);
  }

  async createAsset(asset: CreateAssetInput): Promise<Asset> {
    const validatedAsset = CreateAssetInputSchema.parse(asset);
    return this.service.createAsset(validatedAsset);
  }

  async updateAsset(id: number, asset: UpdateAssetInput): Promise<Asset> {
    const validatedAsset = UpdateAssetInputSchema.parse(asset);
    return this.service.updateAsset(id, validatedAsset);
  }

  async archiveAsset(id: number): Promise<void> {
    return this.service.archiveAsset(id);
  }

  async listCategories(): Promise<AssetCategory[]> {
    return this.service.listCategories();
  }
}

export const createAssetController = (
  service: IAssetService = createAssetService(),
): IAssetController => {
  return new AssetController(service);
};
