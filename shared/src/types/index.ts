// Shared type definitions for the School IT Inventory System
// These types are used across both frontend and backend

// ---------------
// Base / Utility types
// ---------------

/** ISO 8601 date string (e.g. "2026-08-02T21:00:00.000Z") */
export type ISODateString = string;

/** UUID v4 string */
export type UUID = string;

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Paginated API response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Sort direction */
export type SortOrder = 'asc' | 'desc';

/** Generic query parameters for list endpoints */
export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: SortOrder;
  search?: string;
}


// ---------------
// Domain entities (real contracts from ./Asset)
// ---------------

/* Only aliased exports — the primary names come from schemas */
export type {
  Asset,
  AssetCategory,
  AssetListQuery,
} from './Asset';

export type {
  Asset as InventoryAsset,
  AssetCategory as InventoryAssetCategory,
  AssetListQuery as InventoryAssetListQuery,
  CreateAssetInput as InventoryCreateAssetInput,
  UpdateAssetInput as InventoryUpdateAssetInput,
} from './Asset';
