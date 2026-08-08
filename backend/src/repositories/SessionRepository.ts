import type Database from 'better-sqlite3';
import type { AuthSession } from 'shared';
import { getCurrentDb } from '../database/connection';

interface SessionRow {
  id: number;
  user_id: number;
  expires_at: string;
  last_used_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  revoked_at: string | null;
  token_hash: string;
}

const mapSession = (row: SessionRow): AuthSession => ({
  id: row.id,
  userId: row.user_id,
  expiresAt: row.expires_at,
  lastUsedAt: row.last_used_at,
  ipAddress: row.ip_address,
  userAgent: row.user_agent,
  createdAt: row.created_at,
  revokedAt: row.revoked_at,
});

export interface SessionWithTokenHash {
  session: AuthSession;
  tokenHash: string;
}

export interface ISessionRepository {
  createSession(input: {
    userId: number;
    tokenHash: string;
    expiresAt: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<AuthSession>;
  findActiveSessionByTokenHash(tokenHash: string): Promise<SessionWithTokenHash | null>;
  updateLastUsed(sessionId: number): Promise<void>;
  revokeSession(sessionId: number): Promise<void>;
  revokeAllUserSessions(userId: number, exceptSessionId?: number): Promise<void>;
  deleteOrArchiveExpiredSessions(): Promise<void>;
}

export class SessionRepository implements ISessionRepository {
  constructor(private readonly db: Database.Database = getCurrentDb()) {}

  async createSession(input: {
    userId: number;
    tokenHash: string;
    expiresAt: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<AuthSession> {
    const result = this.db
      .prepare(
        'INSERT INTO user_sessions (user_id, token_hash, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      )
      .run(input.userId, input.tokenHash, input.expiresAt, input.ipAddress, input.userAgent);

    const row = this.db.prepare('SELECT * FROM user_sessions WHERE id = ?').get(Number(result.lastInsertRowid)) as SessionRow;
    return mapSession(row);
  }

  async findActiveSessionByTokenHash(tokenHash: string): Promise<SessionWithTokenHash | null> {
    const row = this.db
      .prepare(
        "SELECT * FROM user_sessions WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > datetime('now')",
      )
      .get(tokenHash) as SessionRow | undefined;

    if (!row) {
      return null;
    }

    return {
      session: mapSession(row),
      tokenHash: row.token_hash,
    };
  }

  async updateLastUsed(sessionId: number): Promise<void> {
    this.db.prepare("UPDATE user_sessions SET last_used_at = datetime('now') WHERE id = ?").run(sessionId);
  }

  async revokeSession(sessionId: number): Promise<void> {
    this.db
      .prepare("UPDATE user_sessions SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL")
      .run(sessionId);
  }

  async revokeAllUserSessions(userId: number, exceptSessionId?: number): Promise<void> {
    if (exceptSessionId) {
      this.db
        .prepare(
          "UPDATE user_sessions SET revoked_at = datetime('now') WHERE user_id = ? AND id != ? AND revoked_at IS NULL",
        )
        .run(userId, exceptSessionId);
      return;
    }

    this.db
      .prepare("UPDATE user_sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL")
      .run(userId);
  }

  async deleteOrArchiveExpiredSessions(): Promise<void> {
    this.db
      .prepare(
        "UPDATE user_sessions SET revoked_at = COALESCE(revoked_at, datetime('now')) WHERE expires_at <= datetime('now') AND revoked_at IS NULL",
      )
      .run();
  }
}

export const createSessionRepository = (db?: Database.Database): ISessionRepository => new SessionRepository(db);
