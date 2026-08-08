import type Database from 'better-sqlite3';
import type {
  CreatePersonInput,
  Person,
  PersonListQuery,
  UpdatePersonInput,
} from 'shared';
import { getCurrentDb } from '../database/connection';

interface PersonRow {
  id: number;
  staff_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  department_id: number | null;
  employment_status: Person['employmentStatus'];
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

const mapPerson = (row: PersonRow): Person => ({
  id: row.id,
  staffId: row.staff_id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  jobTitle: row.job_title,
  departmentId: row.department_id,
  employmentStatus: row.employment_status,
  notes: row.notes,
  isActive: row.is_active === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

/** Persistence contract for People. */
export interface IPersonRepository {
  list(query: PersonListQuery): Promise<Person[]>;
  getById(id: number): Promise<Person | null>;
  create(input: CreatePersonInput): Promise<Person>;
  update(id: number, input: UpdatePersonInput): Promise<Person>;
  archive(id: number): Promise<void>;
  hasStaffId(staffId: string, excludeId?: number): Promise<boolean>;
  hasEmail(email: string, excludeId?: number): Promise<boolean>;
  departmentExists(departmentId: number): Promise<boolean>;
}

/** Prepared-statement SQLite repository for personnel records. */
export class PersonRepository implements IPersonRepository {
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  async list(query: PersonListQuery): Promise<Person[]> {
    const conditions = ['archived_at IS NULL'];
    const parameters: Record<string, string | number> = {};
    if (query.search) {
      conditions.push(`(
        first_name LIKE @search OR last_name LIKE @search
        OR (first_name || ' ' || last_name) LIKE @search
        OR staff_id LIKE @search OR email LIKE @search
        OR phone LIKE @search OR job_title LIKE @search
      )`);
      parameters.search = `%${query.search}%`;
    }
    if (query.departmentId !== undefined) {
      conditions.push('department_id = @departmentId');
      parameters.departmentId = query.departmentId;
    }
    if (query.employmentStatus !== undefined) {
      conditions.push('employment_status = @employmentStatus');
      parameters.employmentStatus = query.employmentStatus;
    }
    if (query.isActive !== undefined) {
      conditions.push('is_active = @isActive');
      parameters.isActive = query.isActive ? 1 : 0;
    }
    const columns = {
      staffId: 'staff_id', firstName: 'first_name', lastName: 'last_name',
      jobTitle: 'job_title', employmentStatus: 'employment_status', updatedAt: 'updated_at',
    } as const;
    const sortColumn = columns[query.sortBy ?? 'lastName'];
    const sortOrder = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    parameters.limit = query.pageSize ?? 20;
    parameters.offset = ((query.page ?? 1) - 1) * (query.pageSize ?? 20);
    const rows = this.db.prepare(`
      SELECT * FROM people WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortColumn} ${sortOrder}, id ASC
      LIMIT @limit OFFSET @offset
    `).all(parameters) as PersonRow[];
    return rows.map(mapPerson);
  }

  async getById(id: number): Promise<Person | null> {
    const row = this.db.prepare(
      'SELECT * FROM people WHERE id = ? AND archived_at IS NULL',
    ).get(id) as PersonRow | undefined;
    return row ? mapPerson(row) : null;
  }

  async create(input: CreatePersonInput): Promise<Person> {
    const result = this.db.prepare(`
      INSERT INTO people (
        staff_id, first_name, last_name, email, phone, job_title,
        department_id, employment_status, notes, is_active
      ) VALUES (
        @staffId, @firstName, @lastName, @email, @phone, @jobTitle,
        @departmentId, @employmentStatus, @notes, @isActive
      )
    `).run({
      staffId: input.staffId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      jobTitle: input.jobTitle ?? null,
      departmentId: input.departmentId ?? null,
      employmentStatus: input.employmentStatus ?? 'ACTIVE',
      notes: input.notes ?? null,
      isActive: input.isActive === false ? 0 : 1,
    });
    const person = await this.getById(Number(result.lastInsertRowid));
    if (!person) throw new Error('Created person could not be loaded');
    return person;
  }

  async update(id: number, input: UpdatePersonInput): Promise<Person> {
    const fields: string[] = [];
    const values: Record<string, string | number | null> = { id };
    const columns: Record<keyof UpdatePersonInput, string> = {
      staffId: 'staff_id', firstName: 'first_name', lastName: 'last_name',
      email: 'email', phone: 'phone', jobTitle: 'job_title',
      departmentId: 'department_id', employmentStatus: 'employment_status',
      notes: 'notes', isActive: 'is_active',
    };
    for (const key of Object.keys(input) as Array<keyof UpdatePersonInput>) {
      fields.push(`${columns[key]} = @${key}`);
      const value = input[key];
      if (key === 'isActive') values[key] = value === true ? 1 : 0;
      else if (typeof value === 'string' || typeof value === 'number') values[key] = value;
      else values[key] = null;
    }
    this.db.prepare(`
      UPDATE people SET ${fields.join(', ')}, updated_at = datetime('now')
      WHERE id = @id AND archived_at IS NULL
    `).run(values);
    const person = await this.getById(id);
    if (!person) throw new Error('Updated person could not be loaded');
    return person;
  }

  async archive(id: number): Promise<void> {
    this.db.prepare(`
      UPDATE people SET archived_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ? AND archived_at IS NULL
    `).run(id);
  }

  async hasStaffId(staffId: string, excludeId?: number): Promise<boolean> {
    return this.exists('staff_id', staffId, excludeId);
  }

  async hasEmail(email: string, excludeId?: number): Promise<boolean> {
    return this.exists('email', email, excludeId);
  }

  async departmentExists(departmentId: number): Promise<boolean> {
    return this.db.prepare(
      'SELECT 1 FROM departments WHERE id = ? AND archived_at IS NULL',
    ).get(departmentId) !== undefined;
  }

  private exists(column: 'staff_id' | 'email', value: string, excludeId?: number): boolean {
    return this.db.prepare(`
      SELECT 1 FROM people WHERE ${column} = @value COLLATE NOCASE
        AND (@excludeId IS NULL OR id != @excludeId) LIMIT 1
    `).get({ value, excludeId: excludeId ?? null }) !== undefined;
  }
}

/** Creates a Person repository using the supplied or application database. */
export const createPersonRepository = (
  db?: Database.Database,
): IPersonRepository => new PersonRepository(db);
