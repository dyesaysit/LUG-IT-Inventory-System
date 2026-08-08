// Barrel export for the shared package

export * from './types/index';
export * from './schemas/index';
export * from './constants/index';

// Explicit runtime exports keep CommonJS consumers and Vite's static analyser aligned.
export {
  DepartmentSchema,
  CreateDepartmentInputSchema,
  UpdateDepartmentInputSchema,
  DepartmentListQuerySchema,
} from './schemas/Department';

export {
  PersonSchema,
  CreatePersonInputSchema,
  UpdatePersonInputSchema,
  PersonListQuerySchema,
  EmploymentStatusSchema,
} from './schemas/Person';

export {
  LocationSchema,
  CreateLocationInputSchema,
  UpdateLocationInputSchema,
  LocationListQuerySchema,
} from './schemas/Location';

export {
  AssignmentSchema, AssignmentTypeSchema, AssignmentStatusSchema,
  CreateAssignmentInputSchema, ReturnAssignmentInputSchema,
  UpdateAssignmentInputSchema, AssignmentListQuerySchema,
} from './schemas/Assignment';
export { MaintenanceRecordSchema,MaintenanceTypeSchema,MaintenancePrioritySchema,MaintenanceStatusSchema,CreateMaintenanceInputSchema,UpdateMaintenanceInputSchema,CompleteMaintenanceInputSchema,MaintenanceListQuerySchema } from './schemas/Maintenance';
export { RepairJobSchema,RepairTypeSchema,RepairPrioritySchema,RepairStatusSchema,RepairApprovalStatusSchema,RepairOutcomeSchema,CreateRepairInputSchema,UpdateRepairInputSchema,ApproveRepairInputSchema,CompleteRepairInputSchema,ReturnRepairInputSchema,RepairListQuerySchema } from './schemas/Repair';
export { AuditLogSchema,AuditActionSchema,AuditEntityTypeSchema,AuditLogQuerySchema } from './schemas/Audit';
export { ReportTypeSchema,ReportFormatSchema,ReportDateRangeSchema,ReportFilterSchema } from './schemas/Report';
export { LoginInputSchema,ChangePasswordInputSchema,CreateUserInputSchema,UpdateUserInputSchema,ResetPasswordInputSchema,UserListQuerySchema,UsernameSchema,PasswordSchema } from './schemas/Auth';

export {
  SettingCategorySchema,
  SettingValueTypeSchema,
  UpdateSettingInputSchema,
  BatchUpdateSettingsInputSchema,
  CreateAssetCategoryInputSchema,
  UpdateAssetCategoryInputSchema,
} from './schemas/Settings';

export {
  BackupTypeSchema,
  BackupStatusSchema,
  RestoreBackupInputSchema,
} from './schemas/Backup';

export {
  CreateEquipmentRequestInputSchema,
  ReportProblemInputSchema,
  ReviewRequestInputSchema,
  FulfilRequestInputSchema,
  EquipmentRequestListQuerySchema,
} from './schemas/Portal';

export {
  CreateTicketInputSchema,
  AssignTicketInputSchema,
  CompleteTicketInputSchema,
  ConvertTicketInputSchema,
  TicketListQuerySchema,
} from './schemas/Ticket';
