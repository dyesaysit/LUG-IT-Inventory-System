import type { Asset } from './Asset';

export type MaintenanceType = 'CORRECTIVE'|'PREVENTIVE'|'INSPECTION'|'UPGRADE'|'WARRANTY_SERVICE'|'OTHER';
export type MaintenancePriority = 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
export type MaintenanceStatus = 'REPORTED'|'SCHEDULED'|'IN_PROGRESS'|'WAITING_FOR_PARTS'|'COMPLETED'|'CANCELLED'|'BEYOND_REPAIR';

/** Maintenance history row with joined asset and reporter display data. */
export interface MaintenanceRecord {
  id:number; maintenanceNumber:string; assetId:number; maintenanceType:MaintenanceType;
  priority:MaintenancePriority; status:MaintenanceStatus; reportedDate:string;
  scheduledDate:string|null; startedDate:string|null; completedDate:string|null;
  reportedByPersonId:number|null; assignedTechnician:string|null; vendor:string|null;
  faultDescription:string|null; diagnosis:string|null; workPerformed:string|null;
  partsUsed:string|null; maintenanceCost:number; downtimeHours:number;
  conditionBefore:Asset['condition']|null; conditionAfter:Asset['condition']|null;
  resolution:string|null; notes:string|null; createdAt:string; updatedAt:string; archivedAt:string|null;
  assetTag:string; assetManufacturer:string; assetModel:string; assetSerialNumber:string|null;
  assetStatus:Asset['status']; reporterName:string|null;
}

export interface CreateMaintenanceInput {
  assetId:number; maintenanceType:MaintenanceType; priority:MaintenancePriority;
  reportedDate:string; scheduledDate?:string|null; reportedByPersonId?:number|null;
  assignedTechnician?:string|null; vendor?:string|null; faultDescription?:string|null; notes?:string|null;
}
export interface UpdateMaintenanceInput {
  scheduledDate?:string|null; assignedTechnician?:string|null; vendor?:string|null;
  faultDescription?:string|null; diagnosis?:string|null; workPerformed?:string|null;
  partsUsed?:string|null; maintenanceCost?:number; downtimeHours?:number;
  conditionBefore?:Asset['condition']|null; conditionAfter?:Asset['condition']|null;
  resolution?:string|null; notes?:string|null; startedDate?:string|null;
}
export interface CompleteMaintenanceInput {
  completedDate:string; workPerformed:string; partsUsed?:string|null;
  maintenanceCost?:number; downtimeHours?:number; conditionAfter:Asset['condition'];
  resolution:string; notes?:string|null;
}
export interface MaintenanceListQuery {
  search?:string; assetId?:number; maintenanceType?:MaintenanceType; priority?:MaintenancePriority;
  status?:MaintenanceStatus; assignedTechnician?:string; vendor?:string;
  reportedFrom?:string; reportedTo?:string; scheduledFrom?:string; scheduledTo?:string;
  overdueOnly?:boolean; page?:number; pageSize?:number;
  sortBy?:'reportedDate'|'scheduledDate'|'priority'|'status'|'updatedAt'; sortOrder?:'asc'|'desc';
}
export interface MaintenanceSummary {
  openRequests:number; scheduled:number; inProgress:number; waitingForParts:number;
  completedThisMonth:number; criticalPriority:number; totalCostThisMonth:number;
}
