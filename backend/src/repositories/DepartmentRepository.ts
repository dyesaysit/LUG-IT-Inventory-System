import type Database from 'better-sqlite3';
import type {
  CreateDepartmentInput,
  Department,
  DepartmentListQuery,
  UpdateDepartmentInput,
} from 'shared';
import { getCurrentDb } from '../database/connection';

interface DepartmentRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  head_of_department: string | null;
  email: string | null;
  phone: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

const mapDepartment = (row: DepartmentRow): Department => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  headOfDepartment: row.head_of_department,
  email: row.email,
  phone: row.phone,
  isActive: row.is_active === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

/** Persistence contract for departments. */
export interface IDepartmentRepository {
  list(query: DepartmentListQuery): Promise<Department[]>;
  getById(id: number): Promise<Department | null>;
  create(input: CreateDepartmentInput): Promise<Department>;
  update(id: number, input: UpdateDepartmentInput): Promise<Department>;
  archive(id: number): Promise<void>;
  hasCode(code: string, excludeId?: number): Promise<boolean>;
  hasName(name: string, excludeId?: number): Promise<boolean>;
}

/** Prepared-statement SQLite repository for departments. */
export class DepartmentRepository implements IDepartmentRepository {
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  async list(query: DepartmentListQuery): Promise<Department[]> {
    const conditions = ['archived_at IS NULL'];
    const parameters: Record<string, string | number> = {};
    if (query.search) {
      conditions.push('(code LIKE @search OR name LIKE @search OR head_of_department LIKE @search)');
      parameters.search = `%${query.search}%`;
    }
    if (query.isActive !== undefined) {
      conditions.push('is_active = @isActive');
      parameters.isActive = query.isActive ? 1 : 0;
    }

    const sortColumns = {
      code: 'code', name: 'name', headOfDepartment: 'head_of_department',
      isActive: 'is_active', updatedAt: 'updated_at',
    } as const;
    const sortColumn = sortColumns[query.sortBy ?? 'name'];
    const sortOrder = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    parameters.limit = query.pageSize ?? 20;
    parameters.offset = ((query.page ?? 1) - 1) * (query.pageSize ?? 20);

    const rows = this.db.prepare(`
      SELECT * FROM departments
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortColumn} ${sortOrder}, id ASC
      LIMIT @limit OFFSET @offset
    `).all(parameters) as DepartmentRow[];
    return rows.map(mapDepartment);
  }

  async getById(id: number): Promise<Department | null> {
    const row = this.db.prepare(
      'SELECT * FROM departments WHERE id = ? AND archived_at IS NULL',
    ).get(id) as DepartmentRow | undefined;
    return row ? mapDepartment(row) : null;
  }

  async create(input: CreateDepartmentInput): Promise<Department> {
    const result = this.db.prepare(`
      INSERT INTO departments (
        code, name, description, head_of_department, email, phone, is_active
      ) VALUES (
        @code, @name, @description, @headOfDepartment, @email, @phone, @isActive
      )
    `).run({
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      headOfDepartment: input.headOfDepartment ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      isActive: input.isActive === false ? 0 : 1,
    });
    const department = await this.getById(Number(result.lastInsertRowid));
    if (!department) throw new Error('Created department could not be loaded');
    return department;
  }

  async update(id: number, input: UpdateDepartmentInput): Promise<Department> {
    const fields: string[] = [];
    const values: Record<string, string | number | null> = { id };
    const columns: Record<keyof UpdateDepartmentInput, string> = {
      code: 'code', name: 'name', description: 'description',
      headOfDepartment: 'head_of_department', email: 'email', phone: 'phone',
      isActive: 'is_active',
    };
    for (const key of Object.keys(input) as Array<keyof UpdateDepartmentInput>) {
      fields.push(`${columns[key]} = @${key}`);
      const value = input[key];
      if (key === 'isActive') {
        values[key] = value === true ? 1 : 0;
      } else {
        values[key] = typeof value === 'string' ? value : null;
      }
    }
    this.db.prepare(`
      UPDATE departments SET ${fields.join(', ')}, updated_at = datetime('now')
      WHERE id = @id AND archived_at IS NULL
    `).run(values);
    const department = await this.getById(id);
    if (!department) throw new Error('Updated department could not be loaded');
    return department;
  }

  async archive(id: number): Promise<void> {
    this.db.prepare(`
      UPDATE departments
      SET archived_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ? AND archived_at IS NULL
    `).run(id);
  }

  async hasCode(code: string, excludeId?: number): Promise<boolean> {
    const row = this.db.prepare(`
      SELECT 1 FROM departments
      WHERE code = @value COLLATE NOCASE
        AND (@excludeId IS NULL OR id != @excludeId)
      LIMIT 1
    `).get({ value: code, excludeId: excludeId ?? null });
    return row !== undefined;
  }

  async hasName(name: string, excludeId?: number): Promise<boolean> {
    return this.exists('name', name, excludeId);
  }

  private exists(column: 'name', value: string, excludeId?: number): boolean {
    const row = this.db.prepare(`
      SELECT 1 FROM departments
      WHERE ${column} = @value COLLATE NOCASE AND archived_at IS NULL
        AND (@excludeId IS NULL OR id != @excludeId)
      LIMIT 1
    `).get({ value, excludeId: excludeId ?? null });
    return row !== undefined;
  }
}

/** Creates a department repository using the supplied or application database. */
export const createDepartmentRepository = (
  db?: Database.Database,
): IDepartmentRepository => new DepartmentRepository(db);
