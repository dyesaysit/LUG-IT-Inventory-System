import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { API_PREFIX } from 'shared';
import { createErrorHandler, notFound, requestLogger } from './middleware';
import { createHealthRoutes } from './routes/health.routes';
import type { EnvConfig } from './config';

/**
 * Creates and returns the configured Express application.
 *
 * @param config - Validated application configuration.
 * @returns The configured Express app instance.
 */
export function createApp(config: EnvConfig): express.Application {
  const app = express();

  // ---------------
  // Middleware
  // ---------------

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  // ---------------
  // API Routes
  // ---------------

  app.use(`${API_PREFIX}/health`, createHealthRoutes(config));

  // ---------------
  // 404 for unmatched API routes
  // ---------------

  app.use(`${API_PREFIX}/*`, notFound);

  // ---------------
  // Serve frontend in production
  // ---------------

  if (config.NODE_ENV === 'production') {
    const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

    app.use(express.static(frontendDistPath));

    // SPA fallback: serve index.html for any non-API route
    app.get('*', (_req, res) => {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  // ---------------
  // Error handling
  // ---------------

  app.use(createErrorHandler(config));

  return app;
}