import { createAssetService } from '../services/AssetService';
import type { IAssetService } from '../services/AssetService';
import { CreateAssetCategoryInputSchema, CreateAssetInputSchema, UpdateAssetCategoryInputSchema, UpdateAssetInputSchema } from 'shared';
import type {
  AssetListQuery,
  CreateAssetCategoryInput,
  InventoryAsset as Asset,
  InventoryAssetCategory as AssetCategory,
  InventoryCreateAssetInput as CreateAssetInput,
  InventoryUpdateAssetInput as UpdateAssetInput,
  UpdateAssetCategoryInput,
} from 'shared';
import { recordAudit } from '../services/audit-event';

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
  createCategory(input: CreateAssetCategoryInput): Promise<AssetCategory>;
  updateCategory(id: number, input: UpdateAssetCategoryInput): Promise<AssetCategory>;
  deactivateCategory(id: number): Promise<AssetCategory>;
  activateCategory(id: number): Promise<AssetCategory>;
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
    const created = await this.service.createAsset(validatedAsset);
    await recordAudit('ASSET', created.id, 'CREATE', `Created asset ${validatedAsset.assetTag}`, null, created);
    return created;
  }

  async updateAsset(id: number, asset: UpdateAssetInput): Promise<Asset> {
    const validatedAsset = UpdateAssetInputSchema.parse(asset);
    const previous = await this.service.getAssetById(id);
    const updated = await this.service.updateAsset(id, validatedAsset);
    await recordAudit('ASSET', id, 'UPDATE', `Updated asset ${id}`, previous, updated);
    return updated;
  }

  async archiveAsset(id: number): Promise<void> {
    const previous = await this.service.getAssetById(id);
    await this.service.archiveAsset(id);
    await recordAudit('ASSET', id, 'ARCHIVE', `Archived asset ${id}`, previous);
  }

  async listCategories(): Promise<AssetCategory[]> {
    return this.service.listCategories();
  }

  async createCategory(input: CreateAssetCategoryInput): Promise<AssetCategory> {
    const validated = CreateAssetCategoryInputSchema.parse(input);
    const created = await this.service.createCategory(validated);
    await recordAudit('ASSET', created.id, 'CREATE', `Created asset category ${created.name}`, null, created);
    return created;
  }

  async updateCategory(id: number, input: UpdateAssetCategoryInput): Promise<AssetCategory> {
    const validated = UpdateAssetCategoryInputSchema.parse(input);
    const previous = await this.service.listCategories().then((cats) => cats.find((c) => c.id === id) ?? null);
    const updated = await this.service.updateCategory(id, validated);
    await recordAudit('ASSET', id, 'UPDATE', `Updated asset category ${updated.name}`, previous, updated);
    return updated;
  }

  async deactivateCategory(id: number): Promise<AssetCategory> {
    const updated = await this.service.deactivateCategory(id);
    await recordAudit('ASSET', id, 'ARCHIVE', `Deactivated asset category ${updated.name}`, null, updated);
    return updated;
  }

  async activateCategory(id: number): Promise<AssetCategory> {
    const updated = await this.service.activateCategory(id);
    await recordAudit('ASSET', id, 'UPDATE', `Reactivated asset category ${updated.name}`, null, updated);
    return updated;
  }
}

export const createAssetController = (
  service: IAssetService = createAssetService(),
): IAssetController => {
  return new AssetController(service);
};
