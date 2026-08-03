import { getCurrentDb } from '../database/connection';
import { UpdateAssetInputSchema } from 'shared';
import type {
  AssetListQuery,
  InventoryAsset as Asset,
  InventoryAssetCategory as AssetCategory,
  InventoryCreateAssetInput as CreateAssetInput,
  InventoryUpdateAssetInput as UpdateAssetInput,
} from 'shared';

/**
 * Asset repository interface.
 */
export interface IAssetRepository {
  listAssets(query: AssetListQuery): Promise<Asset[]>;
  getAssetById(id: number): Promise<Asset | null>;
  createAsset(asset: CreateAssetInput): Promise<Asset>;
  updateAsset(id: number, asset: UpdateAssetInput): Promise<Asset>;
  archiveAsset(id: number): Promise<void>;
  listCategories(): Promise<AssetCategory[]>;
  getCategoryById(id: number): Promise<AssetCategory | null>;
}

/**
 * Asset repository implementation.
 */
export class AssetRepository implements IAssetRepository {
  private db = getCurrentDb();

  async listAssets(_query: AssetListQuery): Promise<Asset[]> {
    const rows = await this.db.prepare('SELECT * FROM assets WHERE archived_at IS NULL').all();
    return rows as Asset[];
  }

  async getAssetById(id: number): Promise<Asset | null> {
    const row = await this.db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
    return row as Asset | null;
  }

  async createAsset(asset: CreateAssetInput): Promise<Asset> {
    const result = await this.db.prepare('INSERT INTO assets (asset_tag, serial_number, category_id, manufacturer, model, description, purchase_date, purchase_cost, warranty_expiry_date, condition, status, current_location, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(asset);
    const insertedId = Number(result.lastInsertRowid);
    const insertedAsset = await this.getAssetById(insertedId);
    return insertedAsset as Asset;
  }

  async updateAsset(id: number, asset: UpdateAssetInput): Promise<Asset> {
    const validatedAsset = UpdateAssetInputSchema.parse(asset);
    await this.db.prepare('UPDATE assets SET asset_tag = ?, serial_number = ?, category_id = ?, manufacturer = ?, model = ?, description = ?, purchase_date = ?, purchase_cost = ?, warranty_expiry_date = ?, condition = ?, status = ?, current_location = ?, notes = ? WHERE id = ?').run([validatedAsset.assetTag, validatedAsset.serialNumber, validatedAsset.categoryId, validatedAsset.manufacturer, validatedAsset.model, validatedAsset.description, validatedAsset.purchaseDate, validatedAsset.purchaseCost, validatedAsset.warrantyExpiryDate, validatedAsset.condition, validatedAsset.status, validatedAsset.currentLocation, validatedAsset.notes, id]);
    const updatedAsset = await this.getAssetById(id);
    return updatedAsset as Asset;
  }

  async archiveAsset(id: number): Promise<void> {
    await this.db.prepare('UPDATE assets SET archived_at = datetime(\'now\') WHERE id = ?').run(id);
  }

  async listCategories(): Promise<AssetCategory[]> {
    const rows = await this.db.prepare('SELECT * FROM asset_categories').all();
    return rows as AssetCategory[];
  }

  async getCategoryById(id: number): Promise<AssetCategory | null> {
    const row = await this.db.prepare('SELECT * FROM asset_categories WHERE id = ?').get(id);
    return row as AssetCategory | null;
  }
}

export const createAssetRepository = (): IAssetRepository => {
  return new AssetRepository();
};
