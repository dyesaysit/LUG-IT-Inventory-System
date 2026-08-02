import { z } from 'zod';

// Zod validation schemas shared between frontend and backend.

// ---------------
// Asset schemas
// ---------------

export const assetCategorySchema = z.enum([
  'laptop',
  'desktop',
  'monitor',
  'projector',
  'printer',
  'networking',
  'peripheral',
  'software',
  'other',
]);

export const assetStatusSchema = z.enum([
  'available',
  'assigned',
  'maintenance',
  'retired',
  'lost',
]);

export const createAssetSchema = z.object({
  assetTag: z.string().min(1, 'Asset tag is required').max(50),
  name: z.string().min(1, 'Name is required').max(255),
  category: assetCategorySchema,
  status: assetStatusSchema.default('available'),
  location: z.string().min(1, 'Location is required').max(255),
  serialNumber: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  manufacturer: z.string().max(100).optional(),
  purchaseDate: z.string().datetime().optional(),
  warrantyExpiry: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
});

// Export inferred types
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type QueryParamsInput = z.infer<typeof queryParamsSchema>;