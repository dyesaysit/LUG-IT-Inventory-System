import type Database from 'better-sqlite3';
import type {
  AssetAssignment, AssignmentListQuery, CreateAssignmentInput,
  ReturnAssignmentInput, UpdateAssignmentInput,
} from 'shared';
import { getCurrentDb } from '../database/connection';

interface AssignmentRow {
  id: number; asset_id: number; assignment_type: AssetAssignment['assignmentType'];
  person_id: number | null; department_id: number | null; location_id: number | null;
  assigned_date: string; expected_return_date: string | null; returned_date: string | null;
  status: AssetAssignment['status']; purpose: string | null; notes: string | null;
  assigned_by: string | null; returned_by: string | null;
  created_at: string; updated_at: string; archived_at: string | null;
  asset_tag: string; manufacturer: string; model: string;
  person_name: string | null; department_name: string | null;
  location_name: string | null; location_code: string | null;
}

export interface AssignmentAssetState {
  id: number; status: string; archivedAt: string | null;
}
export interface AssignmentTargetState { id: number; isActive: boolean; archivedAt: string | null }

const mapAssignment = (row: AssignmentRow): AssetAssignment => ({
  id: row.id, assetId: row.asset_id, assignmentType: row.assignment_type,
  personId: row.person_id, departmentId: row.department_id, locationId: row.location_id,
  assignedDate: row.assigned_date, expectedReturnDate: row.expected_return_date,
  returnedDate: row.returned_date, status: row.status, purpose: row.purpose, notes: row.notes,
  assignedBy: row.assigned_by, returnedBy: row.returned_by,
  createdAt: row.created_at, updatedAt: row.updated_at, archivedAt: row.archived_at,
  assetTag: row.asset_tag, assetManufacturer: row.manufacturer, assetModel: row.model,
  personName: row.person_name, departmentName: row.department_name,
  locationName: row.location_name, locationCode: row.location_code,
});

const selectJoined = `
  SELECT aa.*, a.asset_tag, a.manufacturer, a.model,
    CASE WHEN p.id IS NULL THEN NULL ELSE p.first_name || ' ' || p.last_name END AS person_name,
    d.name AS department_name, l.name AS location_name, l.code AS location_code
  FROM asset_assignments aa
  JOIN assets a ON a.id = aa.asset_id
  LEFT JOIN people p ON p.id = aa.person_id
  LEFT JOIN departments d ON d.id = aa.department_id
  LEFT JOIN locations l ON l.id = aa.location_id
`;

/** Typed persistence operations for assignment history and workflows. */
export interface IAssignmentRepository {
  listAssignments(query: AssignmentListQuery): Promise<AssetAssignment[]>;
  getAssignmentById(id: number): Promise<AssetAssignment | null>;
  getActiveAssignmentForAsset(assetId: number): Promise<AssetAssignment | null>;
  createAssignment(input: CreateAssignmentInput, assetStatus: 'ASSIGNED' | 'DEPLOYED'): Promise<AssetAssignment>;
  updateAssignment(id: number, input: UpdateAssignmentInput): Promise<AssetAssignment>;
  returnAssignment(id: number, input: ReturnAssignmentInput): Promise<AssetAssignment>;
  cancelAssignment(id: number): Promise<AssetAssignment>;
  archiveAssignment(id: number): Promise<void>;
  listAssignmentHistoryForAsset(assetId: number): Promise<AssetAssignment[]>;
  listAssignmentsForPerson(personId: number): Promise<AssetAssignment[]>;
  listAssignmentsForDepartment(departmentId: number): Promise<AssetAssignment[]>;
  listAssignmentsForLocation(locationId: number): Promise<AssetAssignment[]>;
  getAssetState(id: number): Promise<AssignmentAssetState | null>;
  getPersonState(id: number): Promise<AssignmentTargetState | null>;
  getDepartmentState(id: number): Promise<AssignmentTargetState | null>;
  getLocationState(id: number): Promise<AssignmentTargetState | null>;
}

/** Better-sqlite3 assignment repository with atomic status synchronization. */
export class AssignmentRepository implements IAssignmentRepository {
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  async listAssignments(query: AssignmentListQuery): Promise<AssetAssignment[]> {
    const conditions = ['aa.archived_at IS NULL'];
    const params: Record<string, string | number> = {};
    if (query.search) {
      conditions.push(`(a.asset_tag LIKE @search OR a.manufacturer LIKE @search OR a.model LIKE @search
        OR p.first_name LIKE @search OR p.last_name LIKE @search OR d.name LIKE @search
        OR l.name LIKE @search OR l.code LIKE @search)`);
      params.search = `%${query.search}%`;
    }
    for (const [key, column] of [
      ['assetId', 'aa.asset_id'], ['personId', 'aa.person_id'],
      ['departmentId', 'aa.department_id'], ['locationId', 'aa.location_id'],
    ] as const) if (query[key] !== undefined) { conditions.push(`${column} = @${key}`); params[key] = query[key]; }
    if (query.assignmentType) { conditions.push('aa.assignment_type = @assignmentType'); params.assignmentType = query.assignmentType; }
    if (query.status) { conditions.push('aa.status = @status'); params.status = query.status; }
    if (query.assignedFrom) { conditions.push('aa.assigned_date >= @assignedFrom'); params.assignedFrom = query.assignedFrom; }
    if (query.assignedTo) { conditions.push('aa.assigned_date <= @assignedTo'); params.assignedTo = query.assignedTo; }
    if (query.overdueOnly) conditions.push("aa.status = 'ACTIVE' AND aa.expected_return_date < date('now')");
    const columns = { assignedDate: 'aa.assigned_date', expectedReturnDate: 'aa.expected_return_date', status: 'aa.status', updatedAt: 'aa.updated_at' } as const;
    params.limit = query.pageSize ?? 20; params.offset = ((query.page ?? 1) - 1) * (query.pageSize ?? 20);
    const order = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const rows = this.db.prepare(`${selectJoined} WHERE ${conditions.join(' AND ')}
      ORDER BY ${columns[query.sortBy ?? 'assignedDate']} ${order}, aa.id DESC LIMIT @limit OFFSET @offset`
    ).all(params) as AssignmentRow[];
    return rows.map(mapAssignment);
  }

  async getAssignmentById(id: number): Promise<AssetAssignment | null> {
    const row = this.db.prepare(`${selectJoined} WHERE aa.id = ? AND aa.archived_at IS NULL`)
      .get(id) as AssignmentRow | undefined;
    return row ? mapAssignment(row) : null;
  }

  async getActiveAssignmentForAsset(assetId: number): Promise<AssetAssignment | null> {
    const row = this.db.prepare(`${selectJoined} WHERE aa.asset_id = ? AND aa.status = 'ACTIVE' AND aa.archived_at IS NULL`)
      .get(assetId) as AssignmentRow | undefined;
    return row ? mapAssignment(row) : null;
  }

  async createAssignment(input: CreateAssignmentInput, assetStatus: 'ASSIGNED' | 'DEPLOYED'): Promise<AssetAssignment> {
    const id = this.db.transaction(() => {
      const result = this.db.prepare(`INSERT INTO asset_assignments (
        asset_id, assignment_type, person_id, department_id, location_id,
        assigned_date, expected_return_date, purpose, notes, assigned_by
      ) VALUES (@assetId, @assignmentType, @personId, @departmentId, @locationId,
        @assignedDate, @expectedReturnDate, @purpose, @notes, @assignedBy)`
      ).run({ ...input, personId: input.personId ?? null, departmentId: input.departmentId ?? null,
        locationId: input.locationId ?? null, expectedReturnDate: input.expectedReturnDate ?? null,
        purpose: input.purpose ?? null, notes: input.notes ?? null, assignedBy: input.assignedBy ?? null });
      this.db.prepare("UPDATE assets SET status = ?, updated_at = datetime('now') WHERE id = ?")
        .run(assetStatus, input.assetId);
      return Number(result.lastInsertRowid);
    })();
    const assignment = await this.getAssignmentById(id);
    if (!assignment) throw new Error('Created assignment could not be loaded');
    return assignment;
  }

  async updateAssignment(id: number, input: UpdateAssignmentInput): Promise<AssetAssignment> {
    const fields: string[] = []; const params: Record<string, string | number | null> = { id };
    const columns = { expectedReturnDate: 'expected_return_date', purpose: 'purpose', notes: 'notes' } as const;
    for (const key of Object.keys(input) as Array<keyof UpdateAssignmentInput>) {
      fields.push(`${columns[key]} = @${key}`); params[key] = input[key] ?? null;
    }
    this.db.prepare(`UPDATE asset_assignments SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(params);
    const assignment = await this.getAssignmentById(id);
    if (!assignment) throw new Error('Updated assignment could not be loaded');
    return assignment;
  }

  async returnAssignment(id: number, input: ReturnAssignmentInput): Promise<AssetAssignment> {
    this.db.transaction(() => {
      const current = this.db.prepare('SELECT asset_id, notes FROM asset_assignments WHERE id = ?').get(id) as { asset_id: number; notes: string | null };
      const returnNotes = input.returnNotes ? [current.notes, `Return: ${input.returnNotes}`].filter(Boolean).join('\n') : current.notes;
      this.db.prepare(`UPDATE asset_assignments SET status = 'RETURNED', returned_date = @returnedDate,
        returned_by = @returnedBy, notes = @notes, updated_at = datetime('now') WHERE id = @id`
      ).run({ id, returnedDate: input.returnedDate, returnedBy: input.returnedBy ?? null, notes: returnNotes });
      let currentLocation: string | null = null;
      const currentLocationId = input.returnLocationId ?? null;
      if (input.returnLocationId) {
        const location = this.db.prepare('SELECT name FROM locations WHERE id = ?').get(input.returnLocationId) as { name: string } | undefined;
        currentLocation = location?.name ?? null;
      }
      this.db.prepare(`UPDATE assets SET status = 'IN_STOCK',
        condition = COALESCE(@condition, condition), current_location = COALESCE(@currentLocation, current_location),
        current_location_id = COALESCE(@currentLocationId, current_location_id),
        updated_at = datetime('now') WHERE id = @assetId`
      ).run({ assetId: current.asset_id, condition: input.conditionOnReturn ?? null, currentLocation, currentLocationId });
    })();
    const assignment = await this.getAssignmentById(id);
    if (!assignment) throw new Error('Returned assignment could not be loaded');
    return assignment;
  }

  async cancelAssignment(id: number): Promise<AssetAssignment> {
    this.db.transaction(() => {
      const row = this.db.prepare('SELECT asset_id FROM asset_assignments WHERE id = ?').get(id) as { asset_id: number };
      this.db.prepare("UPDATE asset_assignments SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?").run(id);
      this.db.prepare("UPDATE assets SET status = 'IN_STOCK', updated_at = datetime('now') WHERE id = ?").run(row.asset_id);
    })();
    const assignment = await this.getAssignmentById(id);
    if (!assignment) throw new Error('Cancelled assignment could not be loaded');
    return assignment;
  }

  async archiveAssignment(id: number): Promise<void> {
    this.db.prepare("UPDATE asset_assignments SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id);
  }
  async listAssignmentHistoryForAsset(assetId: number): Promise<AssetAssignment[]> {
    return this.listAssignments({ assetId, pageSize: 100, sortBy: 'assignedDate', sortOrder: 'desc' });
  }
  async listAssignmentsForPerson(personId: number): Promise<AssetAssignment[]> { return this.listAssignments({ personId, pageSize: 100 }); }
  async listAssignmentsForDepartment(departmentId: number): Promise<AssetAssignment[]> { return this.listAssignments({ departmentId, pageSize: 100 }); }
  async listAssignmentsForLocation(locationId: number): Promise<AssetAssignment[]> { return this.listAssignments({ locationId, pageSize: 100 }); }

  async getAssetState(id: number): Promise<AssignmentAssetState | null> {
    const row = this.db.prepare('SELECT id, status, archived_at FROM assets WHERE id = ?').get(id) as { id: number; status: string; archived_at: string | null } | undefined;
    return row ? { id: row.id, status: row.status, archivedAt: row.archived_at } : null;
  }
  async getPersonState(id: number): Promise<AssignmentTargetState | null> { return this.getTargetState('people', id); }
  async getDepartmentState(id: number): Promise<AssignmentTargetState | null> { return this.getTargetState('departments', id); }
  async getLocationState(id: number): Promise<AssignmentTargetState | null> { return this.getTargetState('locations', id); }
  private getTargetState(table: 'people' | 'departments' | 'locations', id: number): AssignmentTargetState | null {
    const row = this.db.prepare(`SELECT id, is_active, archived_at FROM ${table} WHERE id = ?`).get(id) as { id: number; is_active: number; archived_at: string | null } | undefined;
    return row ? { id: row.id, isActive: row.is_active === 1, archivedAt: row.archived_at } : null;
  }
}

/** Creates an assignment repository. */
export const createAssignmentRepository = (db?: Database.Database): IAssignmentRepository => new AssignmentRepository(db);
