import type Database from 'better-sqlite3';
import type { CreateTicketInput, Ticket, TicketListQuery, TicketStatus, TicketSummary } from 'shared';
import { getCurrentDb } from '../database/connection';

interface TicketRow {
  id: number;
  ticket_number: string;
  title: string;
  description: string | null;
  asset_id: number | null;
  priority: Ticket['priority'];
  status: TicketStatus;
  assigned_to: string | null;
  reported_by_user_id: number | null;
  reported_by_person_id: number | null;
  maintenance_record_id: number | null;
  repair_job_id: number | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  asset_tag: string | null;
  asset_manufacturer: string | null;
  asset_model: string | null;
  maintenance_number: string | null;
  repair_number: string | null;
}

const mapRow = (row: TicketRow): Ticket => ({
  id: row.id,
  ticketNumber: row.ticket_number,
  title: row.title,
  description: row.description,
  assetId: row.asset_id,
  priority: row.priority,
  status: row.status,
  assignedTo: row.assigned_to,
  reportedByUserId: row.reported_by_user_id,
  reportedByPersonId: row.reported_by_person_id,
  maintenanceRecordId: row.maintenance_record_id,
  repairJobId: row.repair_job_id,
  resolution: row.resolution,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  closedAt: row.closed_at,
  assetTag: row.asset_tag,
  assetManufacturer: row.asset_manufacturer,
  assetModel: row.asset_model,
  maintenanceNumber: row.maintenance_number,
  repairNumber: row.repair_number,
});

const SELECT = `
  SELECT t.*, a.asset_tag AS asset_tag, a.manufacturer AS asset_manufacturer, a.model AS asset_model,
         m.maintenance_number AS maintenance_number, r.repair_number AS repair_number
  FROM tickets t
  LEFT JOIN assets a ON a.id = t.asset_id
  LEFT JOIN maintenance_records m ON m.id = t.maintenance_record_id
  LEFT JOIN repair_jobs r ON r.id = t.repair_job_id
`;

export interface ITicketRepository {
  list(query: TicketListQuery): Promise<Ticket[]>;
  summary(): Promise<TicketSummary>;
  getById(id: number): Promise<Ticket | null>;
  listByUser(userId: number): Promise<Ticket[]>;
  create(input: CreateTicketInput, reportedByUserId: number | null, reportedByPersonId: number | null): Promise<Ticket>;
  assign(id: number, assignedTo: string): Promise<Ticket>;
  start(id: number): Promise<Ticket>;
  linkMaintenance(id: number, maintenanceRecordId: number): Promise<Ticket>;
  linkRepair(id: number, repairJobId: number): Promise<Ticket>;
  complete(id: number, resolution: string): Promise<Ticket>;
  close(id: number): Promise<Ticket>;
  cancel(id: number): Promise<Ticket>;
}

const TERMINAL: TicketStatus[] = ['COMPLETED', 'CLOSED', 'CANCELLED'];

export class TicketRepository implements ITicketRepository {
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  async list(query: TicketListQuery): Promise<Ticket[]> {
    const conditions: string[] = [];
    const params: Record<string, string | number> = {};
    if (query.search) {
      conditions.push('(t.ticket_number LIKE @search OR t.title LIKE @search OR t.assigned_to LIKE @search OR a.asset_tag LIKE @search)');
      params.search = `%${query.search}%`;
    }
    if (query.status) {
      conditions.push('t.status = @status');
      params.status = query.status;
    }
    if (query.priority) {
      conditions.push('t.priority = @priority');
      params.priority = query.priority;
    }
    if (query.assetId) {
      conditions.push('t.asset_id = @assetId');
      params.assetId = query.assetId;
    }
    const sortMap = { createdAt: 't.created_at', status: 't.status', priority: 't.priority', updatedAt: 't.updated_at' } as const;
    const sortBy = sortMap[query.sortBy ?? 'createdAt'];
    const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    params.limit = query.pageSize ?? 20;
    params.offset = ((query.page ?? 1) - 1) * (query.pageSize ?? 20);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.db
      .prepare(`${SELECT} ${where} ORDER BY ${sortBy} ${sortOrder}, t.id DESC LIMIT @limit OFFSET @offset`)
      .all(params) as TicketRow[];
    return rows.map(mapRow);
  }

  async summary(): Promise<TicketSummary> {
    const row = this.db
      .prepare(`
        SELECT
          SUM(CASE WHEN status NOT IN ('CLOSED','CANCELLED') THEN 1 ELSE 0 END) AS open,
          SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) AS unassigned,
          SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS inProgress,
          SUM(CASE WHEN status = 'CLOSED' AND substr(closed_at,1,7) = strftime('%Y-%m','now') THEN 1 ELSE 0 END) AS closedThisMonth
        FROM tickets
      `)
      .get() as { open: number | null; unassigned: number | null; inProgress: number | null; closedThisMonth: number | null };
    return {
      open: row.open ?? 0,
      unassigned: row.unassigned ?? 0,
      inProgress: row.inProgress ?? 0,
      closedThisMonth: row.closedThisMonth ?? 0,
    };
  }

  async getById(id: number): Promise<Ticket | null> {
    const row = this.db.prepare(`${SELECT} WHERE t.id = ?`).get(id) as TicketRow | undefined;
    return row ? mapRow(row) : null;
  }

  async listByUser(userId: number): Promise<Ticket[]> {
    const rows = this.db
      .prepare(`${SELECT} WHERE t.reported_by_user_id = ? ORDER BY t.created_at DESC, t.id DESC`)
      .all(userId) as TicketRow[];
    return rows.map(mapRow);
  }

  async create(input: CreateTicketInput, reportedByUserId: number | null, reportedByPersonId: number | null): Promise<Ticket> {
    const id = this.db.transaction(() => {
      const year = new Date().getFullYear().toString();
      const prefix = `TKT-${year}-`;
      const last = this.db
        .prepare('SELECT ticket_number FROM tickets WHERE ticket_number LIKE ? ORDER BY ticket_number DESC LIMIT 1')
        .get(`${prefix}%`) as { ticket_number: string } | undefined;
      const next = last ? Number(last.ticket_number.slice(-4)) + 1 : 1;
      const number = `${prefix}${String(next).padStart(4, '0')}`;
      return Number(
        this.db
          .prepare(`
            INSERT INTO tickets (ticket_number, title, description, asset_id, priority, reported_by_user_id, reported_by_person_id)
            VALUES (@number, @title, @description, @assetId, @priority, @userId, @personId)
          `)
          .run({
            number,
            title: input.title.trim(),
            description: input.description?.trim() || null,
            assetId: input.assetId ?? null,
            priority: input.priority ?? 'MEDIUM',
            userId: reportedByUserId,
            personId: reportedByPersonId,
          }).lastInsertRowid,
      );
    })();
    return (await this.getById(id)) as Ticket;
  }

  private async patch(id: number, sql: string, params: Record<string, string | number | null> = {}): Promise<Ticket> {
    this.db.prepare(`UPDATE tickets SET ${sql}, updated_at = datetime('now') WHERE id = @id`).run({ ...params, id });
    return (await this.getById(id)) as Ticket;
  }

  assign(id: number, assignedTo: string): Promise<Ticket> {
    return this.patch(id, "assigned_to = @assignedTo, status = 'ASSIGNED'", { assignedTo });
  }
  start(id: number): Promise<Ticket> {
    return this.patch(id, "status = 'IN_PROGRESS'");
  }
  linkMaintenance(id: number, maintenanceRecordId: number): Promise<Ticket> {
    return this.patch(id, 'maintenance_record_id = @mid', { mid: maintenanceRecordId });
  }
  linkRepair(id: number, repairJobId: number): Promise<Ticket> {
    return this.patch(id, 'repair_job_id = @rid', { rid: repairJobId });
  }
  complete(id: number, resolution: string): Promise<Ticket> {
    return this.patch(id, "status = 'COMPLETED', resolution = @resolution", { resolution });
  }
  close(id: number): Promise<Ticket> {
    return this.patch(id, "status = 'CLOSED', closed_at = datetime('now')");
  }
  cancel(id: number): Promise<Ticket> {
    return this.patch(id, "status = 'CANCELLED'");
  }
}

export const createTicketRepository = (db?: Database.Database): ITicketRepository => new TicketRepository(db);
export { TERMINAL as TICKET_TERMINAL_STATUSES };
