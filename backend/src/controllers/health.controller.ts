import type { Request, Response } from 'express';
import { getHealth } from '../services/health.service';
import type { EnvConfig } from '../config';

/**
 * Returns a function that handles GET /api/health requests.
 *
 * Uses a factory pattern so the validated config is available
 * without relying on global state.
 *
 * @param config - Validated application configuration.
 * @returns An Express route handler.
 */
export function createHealthController(config: EnvConfig) {
  return (_req: Request, res: Response): void => {
    const health = getHealth(config);
    const statusCode = health.database.status === 'connected' ? 200 : 503;
    res.status(statusCode).json(health);
  };
}