export type ReportType =
  | 'ASSET_REGISTER'
  | 'ASSETS_BY_STATUS'
  | 'ASSETS_BY_CATEGORY'
  | 'ASSETS_BY_DEPARTMENT'
  | 'ASSETS_BY_LOCATION'
  | 'ASSIGNED_ASSETS'
  | 'UNASSIGNED_ASSETS'
  | 'ASSIGNMENT_HISTORY'
  | 'OVERDUE_RETURNS'
  | 'MAINTENANCE_SUMMARY'
  | 'MAINTENANCE_COST'
  | 'REPAIR_SUMMARY'
  | 'REPAIR_COST'
  | 'WARRANTY_EXPIRY'
  | 'DEPARTMENT_INVENTORY'
  | 'LOCATION_INVENTORY'
  | 'PERSON_ASSET_HOLDINGS'
  | 'AUDIT_ACTIVITY';

export type ReportFormat = 'JSON' | 'CSV' | 'XLSX' | 'PDF_PRINT';

export interface ReportDateRange {
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportFilter extends ReportDateRange {
  reportType?: ReportType;
  format?: ReportFormat;
  search?: string;
  departmentId?: number;
  locationId?: number;
  personId?: number;
  categoryId?: number;
  assetStatus?: string;
  assignmentStatus?: string;
  maintenanceStatus?: string;
  repairStatus?: string;
  isActive?: boolean;
  warrantyDays?: 30 | 60 | 90;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReportSummary {
  totalAssets: number;
  assignedAssets: number;
  availableAssets: number;
  assetsUnderRepair: number;
  retiredAssets: number;
  totalDepartments: number;
  totalActivePeople: number;
  totalActiveLocations: number;
  activeAssignments: number;
  overdueAssignments: number;
  openMaintenance: number;
  openRepairs: number;
  warrantyExpiring30Days: number;
  maintenanceCostThisMonth: number;
  repairCostThisMonth: number;
  auditEventsToday: number;
}

export interface AssetReportRow {
  assetTag: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string | null;
  status: string;
  condition: string;
  department: string | null;
  currentHolder: string | null;
  currentLocation: string;
  purchaseDate: string | null;
  purchaseCost: number | null;
  warrantyExpiry: string | null;
  updatedDate: string;
}

export interface AssignmentReportRow {
  asset: string;
  assignmentType: string;
  assignedTo: string;
  assignedDate: string;
  expectedReturn: string | null;
  returnedDate: string | null;
  status: string;
}

export interface MaintenanceReportRow {
  maintenanceNumber: string;
  asset: string;
  type: string;
  priority: string;
  status: string;
  reportedDate: string;
  technician: string | null;
  cost: number;
  downtime: number;
  outcome: string | null;
}

export interface RepairReportRow {
  repairNumber: string;
  asset: string;
  type: string;
  vendor: string | null;
  status: string;
  approvalStatus: string;
  outcome: string | null;
  finalCost: number;
}

export interface DepartmentReportRow {
  department: string;
  totalAssignedAssets: number;
  activePeople: number;
  openAssignments: number;
  openMaintenance: number;
  repairCost: number;
}

export interface LocationReportRow {
  location: string;
  building: string;
  deployedAssets: number;
  networkEquipment: number;
  projectors: number;
  otherEquipment: number;
}

export interface PersonReportRow {
  staffId: string;
  person: string;
  department: string | null;
  activeAssignedAssets: number;
  assignmentDates: string | null;
  expectedReturns: string | null;
  overdueCount: number;
}

export interface AuditReportRow {
  performedAt: string;
  entityType: string;
  entityId: number | null;
  action: string;
  performedBy: string | null;
  summary: string;
  success: boolean;
}

export type ReportRow =
  | AssetReportRow
  | AssignmentReportRow
  | MaintenanceReportRow
  | RepairReportRow
  | DepartmentReportRow
  | LocationReportRow
  | PersonReportRow
  | AuditReportRow
  | Record<string, string | number | boolean | null>;

export interface ReportResult {
  reportType: ReportType;
  title: string;
  description: string;
  generatedAt: string;
  filters: ReportFilter;
  total: number;
  rows: ReportRow[];
}

export interface ReportCatalogItem {
  type: ReportType;
  title: string;
  description: string;
  category: 'Inventory' | 'Assignments' | 'Maintenance and repairs' | 'Administration';
}
