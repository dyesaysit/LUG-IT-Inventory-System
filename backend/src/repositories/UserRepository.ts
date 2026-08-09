import type Database from 'better-sqlite3';
import type { CreateUserInput, UpdateUserInput, User, UserListQuery } from 'shared';
import { getCurrentDb } from '../database/connection';

interface UserRow {
  id: number;
  person_id: number | null;
  username: string;
  email: string | null;
  password_hash: string;
  role_id: number;
  role_code: string;
  role_name: string;
  is_active: number;
  must_change_password: number;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  person_name: string | null;
}

export interface UserWithPassword {
  user: User;
  passwordHash: string;
}

export interface IUserRepository {
  listUsers(query: UserListQuery): Promise<User[]>;
  getUserById(id: number): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserWithPasswordByIdentity(identity: string): Promise<UserWithPassword | null>;
  createUser(input: CreateUserInput, passwordHash: string): Promise<User>;
  updateUser(id: number, input: UpdateUserInput): Promise<User>;
  deactivateUser(id: number): Promise<void>;
  reactivateUser(id: number): Promise<void>;
  updatePasswordHash(id: number, passwordHash: string, mustChangePassword?: boolean): Promise<void>;
  recordSuccessfulLogin(id: number): Promise<void>;
  recordFailedLogin(id: number): Promise<void>;
  resetFailedLoginAttempts(id: number): Promise<void>;
  lockUser(id: number, lockedUntilIso: string): Promise<void>;
  checkDuplicateUsername(username: string, excludeUserId?: number): Promise<boolean>;
  checkDuplicateEmail(email: string, excludeUserId?: number): Promise<boolean>;
  hasActiveStaffAccountForPerson(personId: number, excludeUserId?: number): Promise<boolean>;
  countActiveSystemAdministrators(): Promise<number>;
}

const baseSelect = `
SELECT
  u.id,
  u.person_id,
  u.username,
  u.email,
  u.password_hash,
  u.role_id,
  r.code AS role_code,
  r.name AS role_name,
  u.is_active,
  u.must_change_password,
  u.failed_login_attempts,
  u.locked_until,
  u.last_login_at,
  u.password_changed_at,
  u.created_at,
  u.updated_at,
  u.archived_at,
  CASE WHEN p.id IS NULL THEN NULL ELSE TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) END AS person_name
FROM users u
JOIN roles r ON r.id = u.role_id
LEFT JOIN people p ON p.id = u.person_id
`;

const mapUser = (row: UserRow): User => ({
  id: row.id,
  personId: row.person_id,
  username: row.username,
  email: row.email,
  roleId: row.role_id,
  roleCode: row.role_code,
  roleName: row.role_name,
  isActive: row.is_active === 1,
  mustChangePassword: row.must_change_password === 1,
  failedLoginAttempts: row.failed_login_attempts,
  lockedUntil: row.locked_until,
  lastLoginAt: row.last_login_at,
  passwordChangedAt: row.password_changed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
  personName: row.person_name,
});

export class UserRepository implements IUserRepository {
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  async listUsers(query: UserListQuery): Promise<User[]> {
    const sortMap: Record<NonNullable<UserListQuery['sortBy']>, string> = {
      username: 'u.username',
      email: 'u.email',
      role: 'r.name',
      isActive: 'u.is_active',
      lockedUntil: 'u.locked_until',
      lastLoginAt: 'u.last_login_at',
      updatedAt: 'u.updated_at',
    };
    const sortBy = query.sortBy ? sortMap[query.sortBy] : 'u.username';
    const sortOrder = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const params: Record<string, string | number> = { limit: pageSize, offset };
    const filters: string[] = ['u.archived_at IS NULL'];

    if (query.search) {
      params.search = `%${query.search}%`;
      filters.push('(u.username LIKE @search OR u.email LIKE @search OR p.first_name LIKE @search OR p.last_name LIKE @search)');
    }
    if (query.roleId) {
      params.roleId = query.roleId;
      filters.push('u.role_id = @roleId');
    }
    if (typeof query.isActive === 'boolean') {
      params.isActive = query.isActive ? 1 : 0;
      filters.push('u.is_active = @isActive');
    }
    if (query.lockedOnly) {
      filters.push("u.locked_until IS NOT NULL AND u.locked_until > datetime('now')");
    }

    const rows = this.db
      .prepare(`${baseSelect} WHERE ${filters.join(' AND ')} ORDER BY ${sortBy} ${sortOrder} LIMIT @limit OFFSET @offset`)
      .all(params) as UserRow[];

    return rows.map(mapUser);
  }

  async getUserById(id: number): Promise<User | null> {
    const row = this.db.prepare(`${baseSelect} WHERE u.id = ? AND u.archived_at IS NULL`).get(id) as UserRow | undefined;
    return row ? mapUser(row) : null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const row = this.db
      .prepare(`${baseSelect} WHERE LOWER(u.username) = LOWER(?) AND u.archived_at IS NULL`)
      .get(username) as UserRow | undefined;
    return row ? mapUser(row) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const row = this.db
      .prepare(`${baseSelect} WHERE LOWER(u.email) = LOWER(?) AND u.archived_at IS NULL`)
      .get(email) as UserRow | undefined;
    return row ? mapUser(row) : null;
  }

  async getUserWithPasswordByIdentity(identity: string): Promise<UserWithPassword | null> {
    const row = this.db
      .prepare(`${baseSelect} WHERE (LOWER(u.username) = LOWER(?) OR LOWER(u.email) = LOWER(?)) AND u.archived_at IS NULL`)
      .get(identity, identity) as UserRow | undefined;
    return row ? { user: mapUser(row), passwordHash: row.password_hash } : null;
  }

  async createUser(input: CreateUserInput, passwordHash: string): Promise<User> {
    const result = this.db
      .prepare(`
        INSERT INTO users (person_id, username, email, password_hash, role_id, is_active, must_change_password)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `)
      .run(input.personId ?? null, input.username.trim(), input.email?.trim() || null, passwordHash, input.roleId, input.isActive === false ? 0 : 1);
    return (await this.getUserById(Number(result.lastInsertRowid))) as User;
  }

  async updateUser(id: number, input: UpdateUserInput): Promise<User> {
    const current = await this.getUserById(id);
    if (!current) {
      throw new Error('User not found');
    }

    const next = {
      personId: input.personId !== undefined ? input.personId : current.personId,
      email: input.email !== undefined ? input.email?.trim() || null : current.email,
      roleId: input.roleId ?? current.roleId,
      isActive: input.isActive !== undefined ? (input.isActive ? 1 : 0) : current.isActive ? 1 : 0,
      mustChangePassword:
        input.mustChangePassword !== undefined ? (input.mustChangePassword ? 1 : 0) : current.mustChangePassword ? 1 : 0,
    };

    this.db
      .prepare(`
        UPDATE users
        SET person_id = ?, email = ?, role_id = ?, is_active = ?, must_change_password = ?, updated_at = datetime('now')
        WHERE id = ?
      `)
      .run(next.personId, next.email, next.roleId, next.isActive, next.mustChangePassword, id);

    return (await this.getUserById(id)) as User;
  }

  async deactivateUser(id: number): Promise<void> {
    this.db
      .prepare("UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND archived_at IS NULL")
      .run(id);
  }

  async reactivateUser(id: number): Promise<void> {
    this.db
      .prepare("UPDATE users SET is_active = 1, updated_at = datetime('now'), locked_until = NULL, failed_login_attempts = 0 WHERE id = ? AND archived_at IS NULL")
      .run(id);
  }

  async updatePasswordHash(id: number, passwordHash: string, mustChangePassword = false): Promise<void> {
    this.db
      .prepare(
        "UPDATE users SET password_hash = ?, must_change_password = ?, password_changed_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND archived_at IS NULL",
      )
      .run(passwordHash, mustChangePassword ? 1 : 0, id);
  }

  async recordSuccessfulLogin(id: number): Promise<void> {
    this.db
      .prepare(
        "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      )
      .run(id);
  }

  async recordFailedLogin(id: number): Promise<void> {
    this.db
      .prepare("UPDATE users SET failed_login_attempts = failed_login_attempts + 1, updated_at = datetime('now') WHERE id = ?")
      .run(id);
  }

  async resetFailedLoginAttempts(id: number): Promise<void> {
    this.db
      .prepare("UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?")
      .run(id);
  }

  async lockUser(id: number, lockedUntilIso: string): Promise<void> {
    this.db
      .prepare("UPDATE users SET locked_until = ?, updated_at = datetime('now') WHERE id = ?")
      .run(lockedUntilIso, id);
  }

  async checkDuplicateUsername(username: string, excludeUserId?: number): Promise<boolean> {
    const row = this.db
      .prepare(
        `SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND archived_at IS NULL ${excludeUserId ? 'AND id != ?' : ''}`,
      )
      .get(...(excludeUserId ? [username, excludeUserId] : [username])) as { id: number } | undefined;
    return Boolean(row);
  }

  async checkDuplicateEmail(email: string, excludeUserId?: number): Promise<boolean> {
    const row = this.db
      .prepare(`SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND archived_at IS NULL ${excludeUserId ? 'AND id != ?' : ''}`)
      .get(...(excludeUserId ? [email, excludeUserId] : [email])) as { id: number } | undefined;
    return Boolean(row);
  }

  async hasActiveStaffAccountForPerson(personId: number, excludeUserId?: number): Promise<boolean> {
    const row = this.db
      .prepare(`
        SELECT u.id FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.person_id = ? AND r.code = 'STAFF_USER'
          AND u.is_active = 1 AND u.archived_at IS NULL
          ${excludeUserId ? 'AND u.id != ?' : ''}
        LIMIT 1
      `)
      .get(...(excludeUserId ? [personId, excludeUserId] : [personId])) as { id: number } | undefined;
    return Boolean(row);
  }

  async countActiveSystemAdministrators(): Promise<number> {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) AS count FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'SYSTEM_ADMINISTRATOR' AND u.archived_at IS NULL AND u.is_active = 1",
      )
      .get() as { count: number };
    return row.count;
  }
}

export const createUserRepository = (db?: Database.Database): IUserRepository => new UserRepository(db);
