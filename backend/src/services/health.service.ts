import { checkDatabaseHealth } from '../repositories/health.repository';
import type { EnvConfig } from '../config';

/** Shape of the health endpoint response. */
export interface HealthResponse {
  status: 'ok' | 'degraded';
  application: string;
  environment: string;
  database: { status: 'connected' | 'disconnected' };
  timestamp: string;
  version: string;
}

/**
 * Builds the health-check response.
 *
 * @param config - Validated application configuration.
 * @returns A health status object (never exposes secrets or paths).
 */
export function getHealth(config: EnvConfig): HealthResponse {
  const dbResult = checkDatabaseHealth();

  return {
    status: dbResult.ok ? 'ok' : 'degraded',
    application: config.APP_NAME,
    environment: config.NODE_ENV,
    database: {
      status: dbResult.ok ? 'connected' : 'disconnected',
    },
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };
}