import type Database from 'better-sqlite3';
import type { Permission, Role } from 'shared';
import { getCurrentDb } from '../database/connection';

interface RoleRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_system: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface PermissionRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  module: string;
  created_at: string;
}

const mapRole = (row: RoleRow): Role => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  isSystem: row.is_system === 1,
  isActive: row.is_active === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

const mapPermission = (row: PermissionRow): Permission => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  module: row.module,
  createdAt: row.created_at,
});

export interface IRoleRepository {
  listRoles(): Promise<Role[]>;
  getRoleById(id: number): Promise<Role | null>;
  getRoleByCode(code: string): Promise<Role | null>;
  listPermissionsForRole(roleId: number): Promise<Permission[]>;
  replaceRolePermissions(roleId: number, permissionIds: number[]): Promise<void>;
}

export class RoleRepository implements IRoleRepository {
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  async listRoles(): Promise<Role[]> {
    const rows = this.db
      .prepare('SELECT * FROM roles WHERE archived_at IS NULL ORDER BY name ASC')
      .all() as RoleRow[];
    return rows.map(mapRole);
  }

  async getRoleById(id: number): Promise<Role | null> {
    const row = this.db
      .prepare('SELECT * FROM roles WHERE id = ? AND archived_at IS NULL')
      .get(id) as RoleRow | undefined;
    return row ? mapRole(row) : null;
  }

  async getRoleByCode(code: string): Promise<Role | null> {
    const row = this.db
      .prepare('SELECT * FROM roles WHERE code = ? AND archived_at IS NULL')
      .get(code) as RoleRow | undefined;
    return row ? mapRole(row) : null;
  }

  async listPermissionsForRole(roleId: number): Promise<Permission[]> {
    const rows = this.db
      .prepare(
        `SELECT p.*
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = ?
         ORDER BY p.code ASC`,
      )
      .all(roleId) as PermissionRow[];
    return rows.map(mapPermission);
  }

  async replaceRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId);
      const insert = this.db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
      for (const permissionId of permissionIds) {
        insert.run(roleId, permissionId);
      }
    });
    tx();
  }
}

export const createRoleRepository = (db?: Database.Database): IRoleRepository => new RoleRepository(db);
