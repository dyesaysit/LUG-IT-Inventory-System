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
  Department,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  DepartmentListQuery,
} from './Department';

export type {
  Person,
  CreatePersonInput,
  UpdatePersonInput,
  PersonListQuery,
  EmploymentStatus,
} from './Person';

export type {
  Location,
  CreateLocationInput,
  UpdateLocationInput,
  LocationListQuery,
} from './Location';

export type {
  AssetAssignment, AssignmentType, AssignmentStatus, CreateAssignmentInput,
  ReturnAssignmentInput, UpdateAssignmentInput, AssignmentListQuery,
} from './Assignment';
export type { MaintenanceRecord,MaintenanceType,MaintenancePriority,MaintenanceStatus,CreateMaintenanceInput,UpdateMaintenanceInput,CompleteMaintenanceInput,MaintenanceListQuery,MaintenanceSummary } from './Maintenance';
export type { RepairJob,RepairType,RepairPriority,RepairStatus,RepairApprovalStatus,RepairOutcome,CreateRepairInput,UpdateRepairInput,ApproveRepairInput,CompleteRepairInput,ReturnRepairInput,RepairListQuery,RepairSummary } from './Repair';
export type { AuditLog,AuditAction,AuditEntityType,AuditLogQuery,CreateAuditLogInput,AuditSummary } from './Audit';
export type { ReportType,ReportFormat,ReportDateRange,ReportFilter,ReportSummary,AssetReportRow,AssignmentReportRow,MaintenanceReportRow,RepairReportRow,DepartmentReportRow,LocationReportRow,PersonReportRow,AuditReportRow,ReportRow,ReportResult,ReportCatalogItem } from './Report';
export type { User, SafeUser, Role, Permission, AuthSession, LoginInput, LoginResponse, ChangePasswordInput, CreateUserInput, UpdateUserInput, ResetPasswordInput, UserListQuery, AuthenticatedUser } from './Auth';
export type { EquipmentRequestStatus, EquipmentRequest, CreateEquipmentRequestInput, ReportProblemInput, PortalProfile, ReviewRequestInput, FulfilRequestInput, EquipmentRequestListQuery } from './Portal';
export type { TicketStatus, TicketPriority, Ticket, CreateTicketInput, AssignTicketInput, CompleteTicketInput, ConvertTicketInput, TicketListQuery, TicketSummary } from './Ticket';

export type {
  Asset as InventoryAsset,
  AssetCategory as InventoryAssetCategory,
  AssetListQuery as InventoryAssetListQuery,
  CreateAssetInput as InventoryCreateAssetInput,
  UpdateAssetInput as InventoryUpdateAssetInput,
  CreateAssetCategoryInput,
  UpdateAssetCategoryInput,
} from './Asset';

export type {
  SettingCategory,
  SettingValueType,
  SystemSetting,
  SettingsByCategory,
  SettingsResponse,
  SystemInformation,
  DatabaseMaintenanceResult,
  DatabaseStatus,
} from './Settings';

export type {
  BackupType,
  BackupStatus,
  BackupRecord,
  RestoreBackupResult,
} from './Backup';

export type {
  CountryCode,
  CurrencyCode,
  Timezone,
  LocaleTag,
  DateFormat,
  TimeFormat,
  SupportedCountry,
  OrganizationProfile,
  PublicApplicationSettings,
} from './Organization';

export { SUPPORTED_COUNTRIES, getSupportedCountry } from './Organization';
