import express from 'express';
import type { Express } from 'express';
import type { EnvConfig } from './config';
import { createAssetController } from './controllers/AssetController';
import { createErrorHandler, notFound, requestLogger } from './middleware';
import { createAssetRepository } from './repositories/AssetRepository';
import { createAssetCategoryRouter, createAssetRouter } from './routes/asset.routes';
import { createHealthRouter } from './routes/health.routes';
import { createAssetService } from './services/AssetService';
import { DepartmentController } from './controllers/DepartmentController';
import { createDepartmentRepository } from './repositories/DepartmentRepository';
import { createDepartmentRouter } from './routes/department.routes';
import { DepartmentService } from './services/DepartmentService';

/**
 * Creates the configured Express application.
 *
 * @param config - Validated application configuration.
 * @returns The configured Express application.
 */
export function createApp(config: EnvConfig): Express {
  const app = express();
  const assetRepository = createAssetRepository();
  const assetService = createAssetService(assetRepository);
  const assetController = createAssetController(assetService);
  const departmentRepository = createDepartmentRepository();
  const departmentService = new DepartmentService(departmentRepository);
  const departmentController = new DepartmentController(departmentService);

// Body parsing
  app.use(express.json());
  app.use(requestLogger);

// API routes
  app.use('/api/health', createHealthRouter(config));
  app.use('/api/assets', createAssetRouter(assetController));
  app.use('/api/asset-categories', createAssetCategoryRouter(assetController));
  app.use('/api/departments', createDepartmentRouter(departmentController));

// Serve frontend static files in production
  if (config.NODE_ENV === 'production') {
  const frontendDist = './frontend/dist';
    app.use(express.static(frontendDist));
  // SPA fallback — serve index.html for any non-API route
    app.get('*', (_req, res) => {
      res.sendFile(`${frontendDist}/index.html`);
    });
  }

// Error handling (must be last)
  app.use(notFound);
  app.use(createErrorHandler(config));

  return app;
}
