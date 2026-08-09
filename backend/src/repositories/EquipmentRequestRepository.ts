import type Database from 'better-sqlite3';
import type {
  CreateEquipmentRequestInput,
  EquipmentRequest,
  EquipmentRequestListQuery,
  EquipmentRequestStatus,
} from 'shared';
import { getCurrentDb } from '../database/connection';

interface EquipmentRequestRow {
  id: number;
  requested_by_user_id: number;
  requested_by_person_id: number | null;
  item_name: string;
  category: string | null;
  quantity: number;
  justification: string | null;
  status: EquipmentRequestStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  fulfilment_assignment_id: number | null;
  created_at: string;
  updated_at: string;
  requested_by_name: string | null;
  requested_by_username: string | null;
  fulfilled_asset_id: number | null;
  fulfilled_asset_tag: string | null;
}

const mapRow = (row: EquipmentRequestRow): EquipmentRequest => ({
  id: row.id,
  requestedByUserId: row.requested_by_user_id,
  requestedByPersonId: row.requested_by_person_id,
  itemName: row.item_name,
  category: row.category,
  quantity: row.quantity,
  justification: row.justification,
  status: row.status,
  reviewNotes: row.review_notes,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  fulfilmentAssignmentId: row.fulfilment_assignment_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  requestedByName: row.requested_by_name,
  requestedByUsername: row.requested_by_username,
  fulfilledAssetId: row.fulfilled_asset_id,
  fulfilledAssetTag: row.fulfilled_asset_tag,
});

const SELECT = `
  SELECT er.*,
    TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS requested_by_name,
    u.username AS requested_by_username,
    aa.asset_id AS fulfilled_asset_id,
    a.asset_tag AS fulfilled_asset_tag
  FROM equipment_requests er
  LEFT JOIN people p ON p.id = er.requested_by_person_id
  LEFT JOIN users u ON u.id = er.requested_by_user_id
  LEFT JOIN asset_assignments aa ON aa.id = er.fulfilment_assignment_id
  LEFT JOIN assets a ON a.id = aa.asset_id
`;

/** Persistence contract for staff equipment requests. */
export interface IEquipmentRequestRepository {
  create(userId: number, personId: number | null, input: CreateEquipmentRequestInput): Promise<EquipmentRequest>;
  listByUser(userId: number): Promise<EquipmentRequest[]>;
  listAll(query: EquipmentRequestListQuery): Promise<EquipmentRequest[]>;
  getById(id: number): Promise<EquipmentRequest | null>;
  setStatus(id: number, status: EquipmentRequestStatus): Promise<EquipmentRequest>;
  review(id: number, status: EquipmentRequestStatus, notes: string | null, reviewedBy: string): Promise<EquipmentRequest>;
  fulfil(id: number, assignmentId: number, reviewedBy: string, notes: string | null): Promise<EquipmentRequest>;
}

/** SQLite repository for equipment requests. */
export class EquipmentRequestRepository implements IEquipmentRequestRepository {
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  async create(userId: number, personId: number | null, input: CreateEquipmentRequestInput): Promise<EquipmentRequest> {
    const result = this.db
      .prepare(`
        INSERT INTO equipment_requests (requested_by_user_id, requested_by_person_id, item_name, category, quantity, justification)
        VALUES (@userId, @personId, @itemName, @category, @quantity, @justification)
      `)
      .run({
        userId,
        personId: personId ?? null,
        itemName: input.itemName.trim(),
        category: input.category?.trim() || null,
        quantity: input.quantity,
        justification: input.justification?.trim() || null,
      });
    return (await this.getById(Number(result.lastInsertRowid))) as EquipmentRequest;
  }

  async listByUser(userId: number): Promise<EquipmentRequest[]> {
    const rows = this.db
      .prepare(`${SELECT} WHERE er.requested_by_user_id = ? ORDER BY er.created_at DESC, er.id DESC`)
      .all(userId) as EquipmentRequestRow[];
    return rows.map(mapRow);
  }

  async listAll(query: EquipmentRequestListQuery): Promise<EquipmentRequest[]> {
    const conditions: string[] = [];
    const params: Record<string, string | number> = {};
    if (query.search) {
      conditions.push("(er.item_name LIKE @search OR er.category LIKE @search OR u.username LIKE @search OR (p.first_name || ' ' || p.last_name) LIKE @search)");
      params.search = `%${query.search}%`;
    }
    if (query.status) {
      conditions.push('er.status = @status');
      params.status = query.status;
    }
    const sortMap = { createdAt: 'er.created_at', status: 'er.status', updatedAt: 'er.updated_at' } as const;
    const sortBy = sortMap[query.sortBy ?? 'createdAt'];
    const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    params.limit = query.pageSize ?? 50;
    params.offset = ((query.page ?? 1) - 1) * (query.pageSize ?? 50);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.db
      .prepare(`${SELECT} ${where} ORDER BY ${sortBy} ${sortOrder}, er.id DESC LIMIT @limit OFFSET @offset`)
      .all(params) as EquipmentRequestRow[];
    return rows.map(mapRow);
  }

  async getById(id: number): Promise<EquipmentRequest | null> {
    const row = this.db.prepare(`${SELECT} WHERE er.id = ?`).get(id) as EquipmentRequestRow | undefined;
    return row ? mapRow(row) : null;
  }

  async setStatus(id: number, status: EquipmentRequestStatus): Promise<EquipmentRequest> {
    this.db.prepare("UPDATE equipment_requests SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    return (await this.getById(id)) as EquipmentRequest;
  }

  async review(id: number, status: EquipmentRequestStatus, notes: string | null, reviewedBy: string): Promise<EquipmentRequest> {
    this.db
      .prepare(`
        UPDATE equipment_requests
        SET status = @status, review_notes = @notes, reviewed_by = @reviewedBy,
            reviewed_at = datetime('now'), updated_at = datetime('now')
        WHERE id = @id
      `)
      .run({ id, status, notes: notes ?? null, reviewedBy });
    return (await this.getById(id)) as EquipmentRequest;
  }

  async fulfil(id: number, assignmentId: number, reviewedBy: string, notes: string | null): Promise<EquipmentRequest> {
    this.db
      .prepare(`
        UPDATE equipment_requests
        SET status = 'FULFILLED', fulfilment_assignment_id = @assignmentId,
            review_notes = COALESCE(@notes, review_notes), reviewed_by = @reviewedBy,
            reviewed_at = datetime('now'), updated_at = datetime('now')
        WHERE id = @id
      `)
      .run({ id, assignmentId, reviewedBy, notes: notes ?? null });
    return (await this.getById(id)) as EquipmentRequest;
  }
}

export const createEquipmentRequestRepository = (db?: Database.Database): IEquipmentRequestRepository =>
  new EquipmentRequestRepository(db);
