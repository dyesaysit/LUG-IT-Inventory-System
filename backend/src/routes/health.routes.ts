import { Router } from 'express';
import { createHealthController } from '../controllers/health.controller';
import type { EnvConfig } from '../config';

/**
 * Creates and returns a router for the health endpoint.
 *
 * @param config - Validated application configuration.
 * @returns An Express router with the health route mounted.
 */
export function createHealthRouter(config: EnvConfig): Router {
  const router = Router();
  const healthController = createHealthController(config);

  router.get('/', healthController);

  return router;
}
