import { checkDatabaseHealth } from '../repositories/health.repository';
import type { EnvConfig } from '../config';
import { getCurrentDb } from '../database/connection';

/** Shape of the health endpoint response. */
export interface HealthResponse {
  status: 'ok' | 'degraded';
  application: string;
  environment: string;
  database: { status: 'connected' | 'disconnected' };
  timestamp: string;
  version: string;
  setupRequired: boolean;
}

/**
 * Builds the health-check response.
 *
 * @param config - Validated application configuration.
 * @returns A health status object (never exposes secrets or paths).
 */
export function getHealth(config: EnvConfig): HealthResponse {
  const dbResult = checkDatabaseHealth();
  const administrator = dbResult.ok
    ? (getCurrentDb().prepare(`
        SELECT COUNT(*) AS count FROM users u JOIN roles r ON r.id = u.role_id
        WHERE r.code = 'SYSTEM_ADMINISTRATOR' AND u.is_active = 1 AND u.archived_at IS NULL
      `).get() as { count: number })
    : { count: 0 };

  return {
    status: dbResult.ok ? 'ok' : 'degraded',
    application: config.APP_NAME,
    environment: config.NODE_ENV,
    database: {
      status: dbResult.ok ? 'connected' : 'disconnected',
    },
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    setupRequired: administrator.count === 0,
  };
}
