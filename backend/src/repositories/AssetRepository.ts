import { getCurrentDb } from '../database/connection';
import { UpdateAssetInputSchema } from 'shared';
import type {
  AssetListQuery,
  CreateAssetCategoryInput,
  InventoryAsset as Asset,
  InventoryAssetCategory as AssetCategory,
  InventoryCreateAssetInput as CreateAssetInput,
  InventoryUpdateAssetInput as UpdateAssetInput,
  UpdateAssetCategoryInput,
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
  getCategoryByName(name: string): Promise<AssetCategory | null>;
  createCategory(input: CreateAssetCategoryInput): Promise<AssetCategory>;
  updateCategory(id: number, input: UpdateAssetCategoryInput): Promise<AssetCategory>;
  setCategoryActive(id: number, isActive: boolean): Promise<AssetCategory>;
  countAssetsInCategory(id: number): Promise<number>;
  findLocation(id: number): Promise<{ id: number; name: string } | null>;
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
    const statement = this.db.prepare(`
      INSERT INTO assets (
        asset_tag,
        serial_number,
        category_id,
        manufacturer,
        model,
        description,
        purchase_date,
        purchase_cost,
        warranty_expiry_date,
        condition,
        status,
        current_location_id,
        current_location,
        notes
      ) VALUES (
        @assetTag,
        @serialNumber,
        @categoryId,
        @manufacturer,
        @model,
        @description,
        @purchaseDate,
        @purchaseCost,
        @warrantyExpiryDate,
        @condition,
        @status,
        @currentLocationId,
        COALESCE((SELECT name FROM locations WHERE id = @currentLocationId), ''),
        @notes
      )
    `);
    const result = statement.run(asset);
    const insertedId = Number(result.lastInsertRowid);
    const insertedAsset = await this.getAssetById(insertedId);
    return insertedAsset as Asset;
  }

  async updateAsset(id: number, asset: UpdateAssetInput): Promise<Asset> {
    const validatedAsset = UpdateAssetInputSchema.parse(asset);
    const statement = this.db.prepare(`
      UPDATE assets
      SET
        asset_tag = @assetTag,
        serial_number = @serialNumber,
        category_id = @categoryId,
        manufacturer = @manufacturer,
        model = @model,
        description = @description,
        purchase_date = @purchaseDate,
        purchase_cost = @purchaseCost,
        warranty_expiry_date = @warrantyExpiryDate,
        condition = @condition,
        status = @status,
        current_location_id = @currentLocationId,
        current_location = COALESCE((SELECT name FROM locations WHERE id = @currentLocationId), ''),
        notes = @notes,
        updated_at = datetime('now')
      WHERE id = @id
    `);
    statement.run({ ...validatedAsset, id });
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

  async getCategoryByName(name: string): Promise<AssetCategory | null> {
    const row = await this.db
      .prepare('SELECT * FROM asset_categories WHERE name = ? COLLATE NOCASE')
      .get(name);
    return row as AssetCategory | null;
  }

  async createCategory(input: CreateAssetCategoryInput): Promise<AssetCategory> {
    const statement = this.db.prepare(`
      INSERT INTO asset_categories (name, description, is_active)
      VALUES (@name, @description, @isActive)
    `);
    const result = statement.run({
      name: input.name,
      description: input.description ?? '',
      isActive: (input.isActive ?? true) ? 1 : 0,
    });
    const created = await this.getCategoryById(Number(result.lastInsertRowid));
    return created as AssetCategory;
  }

  async updateCategory(id: number, input: UpdateAssetCategoryInput): Promise<AssetCategory> {
    const existing = await this.getCategoryById(id);
    if (!existing) {
      throw new Error(`Asset category ${id} not found`);
    }
    const statement = this.db.prepare(`
      UPDATE asset_categories
      SET name = @name, description = @description, is_active = @isActive, updated_at = datetime('now')
      WHERE id = @id
    `);
    statement.run({
      id,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      isActive: (input.isActive ?? existing.isActive) ? 1 : 0,
    });
    const updated = await this.getCategoryById(id);
    return updated as AssetCategory;
  }

  async setCategoryActive(id: number, isActive: boolean): Promise<AssetCategory> {
    this.db
      .prepare("UPDATE asset_categories SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
      .run(isActive ? 1 : 0, id);
    const updated = await this.getCategoryById(id);
    if (!updated) {
      throw new Error(`Asset category ${id} not found`);
    }
    return updated;
  }

  async countAssetsInCategory(id: number): Promise<number> {
    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM assets WHERE category_id = ? AND archived_at IS NULL')
      .get(id) as { count: number };
    return row.count;
  }

  async findLocation(id: number): Promise<{ id: number; name: string } | null> {
    const row = this.db
      .prepare('SELECT id, name FROM locations WHERE id = ? AND archived_at IS NULL')
      .get(id) as { id: number; name: string } | undefined;
    return row ?? null;
  }
}

export const createAssetRepository = (): IAssetRepository => {
  return new AssetRepository();
};
