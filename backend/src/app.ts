import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { API_PREFIX } from 'shared';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { assetRoutes } from './routes/assetRoutes';

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

app.use(`${API_PREFIX}/assets`, assetRoutes);

// Health check
app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------
// Serve frontend in production
// ---------------

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

app.use(express.static(frontendDistPath));

// SPA fallback: serve index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// ---------------
// Error handling
// ---------------

app.use(errorHandler);

export { app };