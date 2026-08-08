import { createAssetRepository } from '../repositories/AssetRepository';
import type { IAssetRepository } from '../repositories/AssetRepository';
import { CreateAssetInputSchema, UpdateAssetInputSchema } from 'shared';
import type {
  AssetListQuery,
  CreateAssetCategoryInput,
  InventoryAsset as Asset,
  InventoryAssetCategory as AssetCategory,
  InventoryCreateAssetInput as CreateAssetInput,
  InventoryUpdateAssetInput as UpdateAssetInput,
  UpdateAssetCategoryInput,
} from 'shared';
import { AppError } from '../middleware/errorHandler';

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
  createCategory(input: CreateAssetCategoryInput): Promise<AssetCategory>;
  updateCategory(id: number, input: UpdateAssetCategoryInput): Promise<AssetCategory>;
  deactivateCategory(id: number): Promise<AssetCategory>;
  activateCategory(id: number): Promise<AssetCategory>;
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
    await this.assertLocation(validatedAsset.currentLocationId);
    return this.repository.createAsset(validatedAsset);
  }

  async updateAsset(id: number, asset: UpdateAssetInput): Promise<Asset> {
    const validatedAsset = UpdateAssetInputSchema.parse(asset);
    if (validatedAsset.currentLocationId !== undefined) {
      await this.assertLocation(validatedAsset.currentLocationId);
    }
    return this.repository.updateAsset(id, validatedAsset);
  }

  /** Ensures the selected location exists in the Locations Master and is not archived. */
  private async assertLocation(locationId: number): Promise<void> {
    const location = await this.repository.findLocation(locationId);
    if (!location) {
      throw new AppError('The selected location is not available. Please choose a location from the list.', 400);
    }
  }

  async archiveAsset(id: number): Promise<void> {
    return this.repository.archiveAsset(id);
  }

  async listCategories(): Promise<AssetCategory[]> {
    return this.repository.listCategories();
  }

  async createCategory(input: CreateAssetCategoryInput): Promise<AssetCategory> {
    const existing = await this.repository.getCategoryByName(input.name);
    if (existing) {
      throw new AppError(`A category named "${input.name}" already exists.`, 409);
    }
    return this.repository.createCategory(input);
  }

  async updateCategory(id: number, input: UpdateAssetCategoryInput): Promise<AssetCategory> {
    const existing = await this.repository.getCategoryById(id);
    if (!existing) {
      throw new AppError('Asset category not found.', 404);
    }
    if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.repository.getCategoryByName(input.name);
      if (duplicate) {
        throw new AppError(`A category named "${input.name}" already exists.`, 409);
      }
    }
    return this.repository.updateCategory(id, input);
  }

  async deactivateCategory(id: number): Promise<AssetCategory> {
    const existing = await this.repository.getCategoryById(id);
    if (!existing) {
      throw new AppError('Asset category not found.', 404);
    }
    const assetsInUse = await this.repository.countAssetsInCategory(id);
    if (assetsInUse > 0) {
      throw new AppError(
        `Cannot deactivate this category: ${assetsInUse} active asset(s) are still assigned to it.`,
        409,
      );
    }
    return this.repository.setCategoryActive(id, false);
  }

  async activateCategory(id: number): Promise<AssetCategory> {
    const existing = await this.repository.getCategoryById(id);
    if (!existing) {
      throw new AppError('Asset category not found.', 404);
    }
    return this.repository.setCategoryActive(id, true);
  }
}

export const createAssetService = (
  repository: IAssetRepository = createAssetRepository(),
): IAssetService => {
  return new AssetService(repository);
};
