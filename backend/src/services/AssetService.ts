import { createAssetRepository } from '../repositories/AssetRepository';
import type { IAssetRepository } from '../repositories/AssetRepository';
import { CreateAssetInputSchema, UpdateAssetInputSchema } from 'shared';
import type {
  AssetListQuery,
  InventoryAsset as Asset,
  InventoryAssetCategory as AssetCategory,
  InventoryCreateAssetInput as CreateAssetInput,
  InventoryUpdateAssetInput as UpdateAssetInput,
} from 'shared';

/**
 * Asset service interface.
 */
export interface IAssetService {
  listAssets(query: AssetListQuery): Promise<Asset[]>;
  getAssetById(id: number): Promise<Asset | null>;
  createAsset(asset: CreateAssetInput): Promise<Asset>;
  updateAsset(id: number, asset: UpdateAssetInput): Promise<Asset>;
  archiveAsset(id: number): Promise<void>;
  listCategories(): Promise<AssetCategory[]>;
}

/**
 * Asset service implementation.
 */
export class AssetService implements IAssetService {
  constructor(private readonly repository: IAssetRepository) {}

  async listAssets(query: AssetListQuery): Promise<Asset[]> {
    return this.repository.listAssets(query);
  }

  async getAssetById(id: number): Promise<Asset | null> {
    return this.repository.getAssetById(id);
  }

  async createAsset(asset: CreateAssetInput): Promise<Asset> {
    const validatedAsset = CreateAssetInputSchema.parse(asset);
    return this.repository.createAsset(validatedAsset);
  }

  async updateAsset(id: number, asset: UpdateAssetInput): Promise<Asset> {
    const validatedAsset = UpdateAssetInputSchema.parse(asset);
    return this.repository.updateAsset(id, validatedAsset);
  }

  async archiveAsset(id: number): Promise<void> {
    return this.repository.archiveAsset(id);
  }

  async listCategories(): Promise<AssetCategory[]> {
    return this.repository.listCategories();
  }
}

export const createAssetService = (
  repository: IAssetRepository = createAssetRepository(),
): IAssetService => {
  return new AssetService(repository);
};
