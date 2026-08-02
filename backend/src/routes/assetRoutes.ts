import { Router } from 'express';

// Placeholder: Asset routes will be implemented when asset features are built.
// This file exists so the app.ts can reference a valid router.

const router = Router();

// Placeholder route
router.get('/', (_req, res) => {
  res.json({ message: 'Assets endpoint - not yet implemented' });
});

export { router as assetRoutes };