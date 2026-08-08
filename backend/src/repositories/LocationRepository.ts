import type Database from 'better-sqlite3';
import type {
  CreateLocationInput,
  Location,
  LocationListQuery,
  UpdateLocationInput,
} from 'shared';
import { getCurrentDb } from '../database/connection';

interface LocationRow {
  id: number;
  code: string;
  name: string;
  building: string;
  floor: string | null;
  room: string | null;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

const mapLocation = (row: LocationRow): Location => ({
  id: row.id, code: row.code, name: row.name, building: row.building,
  floor: row.floor, room: row.room, description: row.description,
  isActive: row.is_active === 1, createdAt: row.created_at,
  updatedAt: row.updated_at, archivedAt: row.archived_at,
});

/** Persistence contract for Locations. */
export interface ILocationRepository {
  listLocations(query: LocationListQuery): Promise<Location[]>;
  getLocation(id: number): Promise<Location | null>;
  createLocation(input: CreateLocationInput): Promise<Location>;
  updateLocation(id: number, input: UpdateLocationInput): Promise<Location>;
  archiveLocation(id: number): Promise<void>;
  existsByCode(code: string, excludeId?: number): Promise<boolean>;
  existsByName(name: string, excludeId?: number): Promise<boolean>;
  countActiveAssetsAtLocation(id: number): Promise<number>;
}

/** Prepared-statement SQLite repository for physical locations. */
export class LocationRepository implements ILocationRepository {
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  async listLocations(query: LocationListQuery): Promise<Location[]> {
    const conditions = ['archived_at IS NULL'];
    const parameters: Record<string, string | number> = {};
    if (query.search) {
      conditions.push(`(
        code LIKE @search OR name LIKE @search OR building LIKE @search
        OR floor LIKE @search OR room LIKE @search OR description LIKE @search
      )`);
      parameters.search = `%${query.search}%`;
    }
    if (query.building) {
      conditions.push('building = @building COLLATE NOCASE');
      parameters.building = query.building;
    }
    if (query.isActive !== undefined) {
      conditions.push('is_active = @isActive');
      parameters.isActive = query.isActive ? 1 : 0;
    }
    const columns = {
      code: 'code', name: 'name', building: 'building', floor: 'floor', room: 'room',
      isActive: 'is_active', updatedAt: 'updated_at',
    } as const;
    const sortColumn = columns[query.sortBy ?? 'name'];
    const sortOrder = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    parameters.limit = query.pageSize ?? 20;
    parameters.offset = ((query.page ?? 1) - 1) * (query.pageSize ?? 20);
    const rows = this.db.prepare(`
      SELECT * FROM locations WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortColumn} ${sortOrder}, id ASC
      LIMIT @limit OFFSET @offset
    `).all(parameters) as LocationRow[];
    return rows.map(mapLocation);
  }

  async getLocation(id: number): Promise<Location | null> {
    const row = this.db.prepare(
      'SELECT * FROM locations WHERE id = ? AND archived_at IS NULL',
    ).get(id) as LocationRow | undefined;
    return row ? mapLocation(row) : null;
  }

  async createLocation(input: CreateLocationInput): Promise<Location> {
    const result = this.db.prepare(`
      INSERT INTO locations (code, name, building, floor, room, description, is_active)
      VALUES (@code, @name, @building, @floor, @room, @description, @isActive)
    `).run({
      code: input.code, name: input.name, building: input.building,
      floor: input.floor ?? null, room: input.room ?? null,
      description: input.description ?? null, isActive: input.isActive === false ? 0 : 1,
    });
    const location = await this.getLocation(Number(result.lastInsertRowid));
    if (!location) throw new Error('Created location could not be loaded');
    return location;
  }

  async updateLocation(id: number, input: UpdateLocationInput): Promise<Location> {
    const fields: string[] = [];
    const values: Record<string, string | number | null> = { id };
    const columns: Record<keyof UpdateLocationInput, string> = {
      code: 'code', name: 'name', building: 'building', floor: 'floor', room: 'room',
      description: 'description', isActive: 'is_active',
    };
    for (const key of Object.keys(input) as Array<keyof UpdateLocationInput>) {
      fields.push(`${columns[key]} = @${key}`);
      const value = input[key];
      if (key === 'isActive') values[key] = value === true ? 1 : 0;
      else values[key] = typeof value === 'string' ? value : null;
    }
    this.db.prepare(`
      UPDATE locations SET ${fields.join(', ')}, updated_at = datetime('now')
      WHERE id = @id AND archived_at IS NULL
    `).run(values);
    const location = await this.getLocation(id);
    if (!location) throw new Error('Updated location could not be loaded');
    return location;
  }

  async archiveLocation(id: number): Promise<void> {
    this.db.prepare(`
      UPDATE locations SET archived_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ? AND archived_at IS NULL
    `).run(id);
  }

  async countActiveAssetsAtLocation(id: number): Promise<number> {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM assets WHERE current_location_id = ? AND archived_at IS NULL')
      .get(id) as { count: number };
    return row.count;
  }

  async existsByCode(code: string, excludeId?: number): Promise<boolean> {
    return this.exists('code', code, excludeId, false);
  }

  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    return this.exists('name', name, excludeId, true);
  }

  private exists(
    column: 'code' | 'name', value: string, excludeId: number | undefined, activeOnly: boolean,
  ): boolean {
    const archivedClause = activeOnly ? 'AND archived_at IS NULL' : '';
    return this.db.prepare(`
      SELECT 1 FROM locations WHERE ${column} = @value COLLATE NOCASE ${archivedClause}
        AND (@excludeId IS NULL OR id != @excludeId) LIMIT 1
    `).get({ value, excludeId: excludeId ?? null }) !== undefined;
  }
}

/** Creates a Location repository with the supplied or application database. */
export const createLocationRepository = (
  db?: Database.Database,
): ILocationRepository => new LocationRepository(db);
