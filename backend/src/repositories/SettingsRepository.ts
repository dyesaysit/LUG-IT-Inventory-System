import type Database from 'better-sqlite3';
import type { SettingCategory, SystemSetting } from 'shared';
import { getCurrentDb } from '../database/connection';

interface SettingRow {
  id: number;
  category: string;
  key: string;
  value: string;
  value_type: string;
  description: string | null;
  is_sensitive: number;
  is_editable: number;
  created_at: string;
  updated_at: string;
  updated_by: number | null;
}

const mapSetting = (row: SettingRow): SystemSetting => ({
  id: row.id,
  category: row.category as SettingCategory,
  key: row.key,
  value: row.value,
  valueType: row.value_type as SystemSetting['valueType'],
  description: row.description,
  isSensitive: row.is_sensitive === 1,
  isEditable: row.is_editable === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  updatedBy: row.updated_by,
});

/** A single category/key/value triple applied as part of a batch update. */
export interface SettingUpdate {
  category: string;
  key: string;
  value: string;
}

/** Persistence contract for system settings. */
export interface ISettingsRepository {
  listSettings(): Promise<SystemSetting[]>;
  listSettingsByCategory(category: string): Promise<SystemSetting[]>;
  getSetting(category: string, key: string): Promise<SystemSetting | null>;
  updateSetting(category: string, key: string, value: string, updatedBy: number | null): Promise<SystemSetting>;
  updateSettingsBatch(updates: SettingUpdate[], updatedBy: number | null): Promise<SystemSetting[]>;
  getPublicSettings(): Promise<SystemSetting[]>;
  getEditableSettings(): Promise<SystemSetting[]>;
}

/** Prepared-statement SQLite repository for system settings. */
export class SettingsRepository implements ISettingsRepository {
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  async listSettings(): Promise<SystemSetting[]> {
    const rows = this.db
      .prepare('SELECT * FROM system_settings ORDER BY category ASC, key ASC')
      .all() as SettingRow[];
    return rows.map(mapSetting);
  }

  async listSettingsByCategory(category: string): Promise<SystemSetting[]> {
    const rows = this.db
      .prepare('SELECT * FROM system_settings WHERE category = ? ORDER BY key ASC')
      .all(category) as SettingRow[];
    return rows.map(mapSetting);
  }

  async getSetting(category: string, key: string): Promise<SystemSetting | null> {
    const row = this.db
      .prepare('SELECT * FROM system_settings WHERE category = ? AND key = ?')
      .get(category, key) as SettingRow | undefined;
    return row ? mapSetting(row) : null;
  }

  async updateSetting(category: string, key: string, value: string, updatedBy: number | null): Promise<SystemSetting> {
    this.db
      .prepare(
        `UPDATE system_settings
         SET value = @value, updated_at = datetime('now'), updated_by = @updatedBy
         WHERE category = @category AND key = @key`,
      )
      .run({ category, key, value, updatedBy });
    const updated = await this.getSetting(category, key);
    if (!updated) {
      throw new Error(`Setting ${category}.${key} not found after update`);
    }
    return updated;
  }

  async updateSettingsBatch(updates: SettingUpdate[], updatedBy: number | null): Promise<SystemSetting[]> {
    const statement = this.db.prepare(
      `UPDATE system_settings
       SET value = @value, updated_at = datetime('now'), updated_by = @updatedBy
       WHERE category = @category AND key = @key`,
    );
    const applyAll = this.db.transaction((items: SettingUpdate[]) => {
      for (const item of items) {
        statement.run({ ...item, updatedBy });
      }
    });
    applyAll(updates);
    const results: SystemSetting[] = [];
    for (const item of updates) {
      const updated = await this.getSetting(item.category, item.key);
      if (updated) results.push(updated);
    }
    return results;
  }

  async getPublicSettings(): Promise<SystemSetting[]> {
    const rows = this.db
      .prepare('SELECT * FROM system_settings WHERE is_sensitive = 0 ORDER BY category ASC, key ASC')
      .all() as SettingRow[];
    return rows.map(mapSetting);
  }

  async getEditableSettings(): Promise<SystemSetting[]> {
    const rows = this.db
      .prepare('SELECT * FROM system_settings WHERE is_editable = 1 ORDER BY category ASC, key ASC')
      .all() as SettingRow[];
    return rows.map(mapSetting);
  }
}

export const createSettingsRepository = (db?: Database.Database): ISettingsRepository =>
  new SettingsRepository(db);

