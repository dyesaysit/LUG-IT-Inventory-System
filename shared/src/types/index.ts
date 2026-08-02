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
// Domain entities
// ---------------

/** An IT asset in the inventory (e.g. a laptop, monitor, projector, etc.) */
export interface Asset {
  id: UUID;
  assetTag: string;
  name: string;
  category: AssetCategory;
  status: AssetStatus;
  location: string;
  assignedTo?: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  purchaseDate?: ISODateString;
  warrantyExpiry?: ISODateString;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Categories for IT assets */
export type AssetCategory =
  | 'laptop'
  | 'desktop'
  | 'monitor'
  | 'projector'
  | 'printer'
  | 'networking'
  | 'peripheral'
  | 'software'
  | 'other';

/** Statuses an asset can have */
export type AssetStatus =
  | 'available'
  | 'assigned'
  | 'maintenance'
  | 'retired'
  | 'lost';

// Placeholder: additional entity interfaces will be added as features are implemented
// export interface User { ... }
// export interface MaintenanceLog { ... }
// export interface CheckoutRecord { ... }