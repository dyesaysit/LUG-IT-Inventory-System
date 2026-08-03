import { getCurrentDb } from '../database';

/** Result of a database health check. */
export interface DbHealthResult {
  ok: boolean;
  error?: string;
}

/**
 * Checks whether the database connection is alive by running a simple query.
 *
 * @returns An object indicating database health status.
 */
export function checkDatabaseHealth(): DbHealthResult {
  try {
    const db = getCurrentDb();
    db.prepare('SELECT 1').get();
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Database is unavailable',
    };
  }
}