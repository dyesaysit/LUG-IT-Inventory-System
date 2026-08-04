import { z } from 'zod';

export const createAssetSchema = z.object({
  assetTag: z.string(),
  serialNumber: z.string(),
  categoryId: z.number(),
  manufacturer: z.string(),
  model: z.string(),
  description: z.string(),
  purchaseDate: z.string(),
  purchaseCost: z.number(),
  warrantyExpiryDate: z.string(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']),
  status: z.enum(['IN_STOCK', 'ASSIGNED', 'DEPLOYED', 'UNDER_REPAIR', 'RETIRED', 'LOST', 'DISPOSED']),
  currentLocation: z.string(),
  notes: z.string()
});

export const updateAssetSchema = z.object({
  assetTag: z.string(),
  serialNumber: z.string(),
  categoryId: z.number(),
  manufacturer: z.string(),
  model: z.string(),
  description: z.string(),
  purchaseDate: z.string(),
  purchaseCost: z.number(),
  warrantyExpiryDate: z.string(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']),
  status: z.enum(['IN_STOCK', 'ASSIGNED', 'DEPLOYED', 'UNDER_REPAIR', 'RETIRED', 'LOST', 'DISPOSED']),
  currentLocation: z.string(),
  notes: z.string()
});

export const CreateAssetInputSchema = createAssetSchema;
export const UpdateAssetInputSchema = updateAssetSchema;
export const AssetListQuerySchema = z.object({
  // Add properties for asset list query
});