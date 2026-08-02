// Shared application constants

/** Application name */
export const APP_NAME = 'School IT Inventory System';

/** API base path prefix */
export const API_PREFIX = '/api/v1';

/** Default pagination values */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Asset categories with human-readable labels */
export const ASSET_CATEGORIES = {
  laptop: 'Laptop',
  desktop: 'Desktop',
  monitor: 'Monitor',
  projector: 'Projector',
  printer: 'Printer',
  networking: 'Networking Equipment',
  peripheral: 'Peripheral',
  software: 'Software License',
  other: 'Other',
} as const;

/** Asset statuses with human-readable labels */
export const ASSET_STATUSES = {
  available: 'Available',
  assigned: 'Assigned',
  maintenance: 'Under Maintenance',
  retired: 'Retired',
  lost: 'Lost',
} as const;