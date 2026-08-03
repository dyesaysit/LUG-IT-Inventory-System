import { z } from 'zod';

/**
 * Zod schema for validating Asset objects.
 */
export const AssetSchema = z.object({
  id: z.number(),
  assetTag: z.string(),
  serialNumber: z.string().nullable(),
  categoryId: z.number(),
  manufacturer: z.string(),
  model: z.string(),
  description: z.string(),
  purchaseDate: z.string().nullable(),
  purchaseCost: z.number().nullable(),
  warrantyExpiryDate: z.string().nullable(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']),
  status: z.enum(['IN_STOCK', 'ASSIGNED', 'DEPLOYED', 'UNDER_REPAIR', 'RETIRED', 'LOST', 'DISPOSED']),
  currentLocation: z.string(),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
});

/**
 * Zod schema for validating AssetCategory objects.
 */
export const AssetCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Zod schema for validating CreateAssetInput objects.
 */
export const CreateAssetInputSchema = z.object({
  assetTag: z.string(),
  serialNumber: z.string().nullable(),
  categoryId: z.number(),
  manufacturer: z.string(),
  model: z.string(),
  description: z.string(),
  purchaseDate: z.string().nullable(),
  purchaseCost: z.number().nullable(),
  warrantyExpiryDate: z.string().nullable(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']),
  status: z.enum(['IN_STOCK', 'ASSIGNED', 'DEPLOYED', 'UNDER_REPAIR', 'RETIRED', 'LOST', 'DISPOSED']),
  currentLocation: z.string(),
  notes: z.string(),
});

/**
 * Zod schema for validating UpdateAssetInput objects.
 */
export const UpdateAssetInputSchema = z.object({
  assetTag: z.string().optional(),
  serialNumber: z.string().nullable().optional(),
  categoryId: z.number().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  description: z.string().optional(),
  purchaseDate: z.string().nullable().optional(),
  purchaseCost: z.number().nullable().optional(),
  warrantyExpiryDate: z.string().nullable().optional(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional(),
  status: z.enum(['IN_STOCK', 'ASSIGNED', 'DEPLOYED', 'UNDER_REPAIR', 'RETIRED', 'LOST', 'DISPOSED']).optional(),
  currentLocation: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Zod schema for validating AssetListQuery objects.
 */
export const AssetListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['IN_STOCK', 'ASSIGNED', 'DEPLOYED', 'UNDER_REPAIR', 'RETIRED', 'LOST', 'DISPOSED']).optional(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional(),
  categoryId: z.number().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
