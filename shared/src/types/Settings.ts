/**
 * A settings category groups related system settings together.
 */
export type SettingCategory =
  | 'ORGANIZATION'
  | 'INVENTORY'
  | 'ASSIGNMENTS'
  | 'MAINTENANCE'
  | 'REPORTS'
  | 'SECURITY'
  | 'EMAIL';

/** The runtime type a setting's string value should be interpreted as. */
export type SettingValueType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';

/**
 * A single system setting record. Values are always persisted as strings
 * and interpreted according to `valueType`. Sensitive values are masked
 * before leaving the backend (see `SettingsService`).
 */
export interface SystemSetting {
  id: number;
  category: SettingCategory;
  key: string;
  value: string;
  valueType: SettingValueType;
  description: string | null;
  isSensitive: boolean;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: number | null;
}

/** System settings grouped by category, as returned by the settings API. */
export type SettingsByCategory = Record<string, SystemSetting[]>;

/** Response shape for the settings list/category endpoints. */
export interface SettingsResponse {
  settings: SettingsByCategory;
  readOnly: boolean;
}

/**
 * Safe, non-sensitive system information surfaced on the Settings page.
 */
export interface SystemInformation {
  appName: string;
  appVersion: string;
  environment: string;
  nodeVersion: string;
  sqliteVersion: string;
  databaseSizeBytes: number;
  lastMigration: string | null;
  uptimeSeconds: number;
  totalUsers: number;
  activeSessions: number;
  lastBackupAt: string | null;
  currentTimezone: string;
  currentCurrency: string;
  serverTime: string;
}

/** Result of a database maintenance operation. */
export interface DatabaseMaintenanceResult {
  operation: 'INTEGRITY_CHECK' | 'OPTIMIZE' | 'CHECKPOINT';
  success: boolean;
  message: string;
  ranAt: string;
}

/** Current database file size and pragma status, shown on the maintenance panel. */
export interface DatabaseStatus {
  sizeBytes: number;
  pageCount: number;
  freelistCount: number;
  journalMode: string;
  walAutocheckpoint: number;
}
