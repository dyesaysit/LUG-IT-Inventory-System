/**
 * Asset type definition.
 */
export interface Asset {
  id: number;
  assetTag: string;
  serialNumber: string | null;
  categoryId: number;
  manufacturer: string;
  model: string;
  description: string;
  purchaseDate: string | null;
  purchaseCost: number | null;
  warrantyExpiryDate: string | null;
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  status: 'IN_STOCK' | 'ASSIGNED' | 'DEPLOYED' | 'UNDER_REPAIR' | 'RETIRED' | 'LOST' | 'DISPOSED';
  currentLocation: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

/**
 * Asset category type definition.
 */
export interface AssetCategory {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create asset input type definition.
 */
export interface CreateAssetInput {
  assetTag: string;
  serialNumber: string | null;
  categoryId: number;
  manufacturer: string;
  model: string;
  description: string;
  purchaseDate: string | null;
  purchaseCost: number | null;
  warrantyExpiryDate: string | null;
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  status: 'IN_STOCK' | 'ASSIGNED' | 'DEPLOYED' | 'UNDER_REPAIR' | 'RETIRED' | 'LOST' | 'DISPOSED';
  currentLocation: string;
  notes: string;
}

/**
 * Update asset input type definition.
 */
export interface UpdateAssetInput {
  assetTag?: string;
  serialNumber?: string | null;
  categoryId?: number;
  manufacturer?: string;
  model?: string;
  description?: string;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyExpiryDate?: string | null;
  condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  status?: 'IN_STOCK' | 'ASSIGNED' | 'DEPLOYED' | 'UNDER_REPAIR' | 'RETIRED' | 'LOST' | 'DISPOSED';
  currentLocation?: string;
  notes?: string;
}

/**
 * Asset list query type definition.
 */
export interface AssetListQuery {
  search?: string;
  status?: 'IN_STOCK' | 'ASSIGNED' | 'DEPLOYED' | 'UNDER_REPAIR' | 'RETIRED' | 'LOST' | 'DISPOSED';
  condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  categoryId?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}