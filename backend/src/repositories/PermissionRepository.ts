import type Database from 'better-sqlite3';
import type { Permission } from 'shared';
import { getCurrentDb } from '../database/connection';

interface PermissionRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  module: string;
  created_at: string;
}

const mapPermission = (row: PermissionRow): Permission => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  module: row.module,
  createdAt: row.created_at,
});

export interface IPermissionRepository {
  listPermissions(): Promise<Permission[]>;
}

export class PermissionRepository implements IPermissionRepository {
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  async listPermissions(): Promise<Permission[]> {
    const rows = this.db.prepare('SELECT * FROM permissions ORDER BY module, code').all() as PermissionRow[];
    return rows.map(mapPermission);
  }
}

export const createPermissionRepository = (db?: Database.Database): IPermissionRepository =>
  new PermissionRepository(db);
