import { z } from 'zod';
const date=z.string().date(); const text=z.string().trim().max(2000).nullable().optional();
const condition=z.enum(['NEW','GOOD','FAIR','POOR','DAMAGED']);
export const MaintenanceTypeSchema=z.enum(['CORRECTIVE','PREVENTIVE','INSPECTION','UPGRADE','WARRANTY_SERVICE','OTHER']);
export const MaintenancePrioritySchema=z.enum(['LOW','MEDIUM','HIGH','CRITICAL']);
export const MaintenanceStatusSchema=z.enum(['REPORTED','SCHEDULED','IN_PROGRESS','WAITING_FOR_PARTS','COMPLETED','CANCELLED','BEYOND_REPAIR']);
export const CreateMaintenanceInputSchema=z.object({
  assetId:z.number().int().positive(), maintenanceType:MaintenanceTypeSchema,
  priority:MaintenancePrioritySchema.default('MEDIUM'), reportedDate:date,
  scheduledDate:date.nullable().optional(), reportedByPersonId:z.number().int().positive().nullable().optional(),
  assignedTechnician:text, vendor:text, faultDescription:text, notes:text,
}).superRefine((input,ctx)=>{
  if(input.maintenanceType==='CORRECTIVE'&&!input.faultDescription?.trim()) ctx.addIssue({code:z.ZodIssueCode.custom,message:'Fault description is required for corrective maintenance',path:['faultDescription']});
  if(input.scheduledDate&&input.scheduledDate<input.reportedDate) ctx.addIssue({code:z.ZodIssueCode.custom,message:'Scheduled date cannot be before reported date',path:['scheduledDate']});
});
export const UpdateMaintenanceInputSchema=z.object({
  scheduledDate:date.nullable().optional(), assignedTechnician:text, vendor:text,
  faultDescription:text, diagnosis:text, workPerformed:text, partsUsed:text,
  maintenanceCost:z.number().nonnegative().optional(), downtimeHours:z.number().nonnegative().optional(),
  conditionBefore:condition.nullable().optional(), conditionAfter:condition.nullable().optional(),
  resolution:text, notes:text, startedDate:date.nullable().optional(),
});
export const CompleteMaintenanceInputSchema=z.object({
  completedDate:date, workPerformed:z.string().trim().min(1).max(2000), partsUsed:text,
  maintenanceCost:z.number().nonnegative().default(0), downtimeHours:z.number().nonnegative().default(0),
  conditionAfter:condition, resolution:z.string().trim().min(1).max(2000), notes:text,
});
export const MaintenanceListQuerySchema=z.object({
  search:z.string().trim().max(120).optional(), assetId:z.coerce.number().int().positive().optional(),
  maintenanceType:MaintenanceTypeSchema.optional(), priority:MaintenancePrioritySchema.optional(),
  status:MaintenanceStatusSchema.optional(), assignedTechnician:z.string().trim().optional(), vendor:z.string().trim().optional(),
  reportedFrom:date.optional(), reportedTo:date.optional(), scheduledFrom:date.optional(), scheduledTo:date.optional(),
  overdueOnly:z.preprocess(v=>v==='true'?true:v==='false'?false:v,z.boolean().optional()),
  page:z.coerce.number().int().positive().default(1), pageSize:z.coerce.number().int().positive().max(100).default(20),
  sortBy:z.enum(['reportedDate','scheduledDate','priority','status','updatedAt']).default('reportedDate'),
  sortOrder:z.enum(['asc','desc']).default('desc'),
});
export const MaintenanceRecordSchema=z.object({
  id:z.number().int().positive(),maintenanceNumber:z.string(),assetId:z.number().int().positive(),
  maintenanceType:MaintenanceTypeSchema,priority:MaintenancePrioritySchema,status:MaintenanceStatusSchema,
  reportedDate:date,scheduledDate:date.nullable(),startedDate:date.nullable(),completedDate:date.nullable(),
  reportedByPersonId:z.number().int().positive().nullable(),assignedTechnician:z.string().nullable(),vendor:z.string().nullable(),
  faultDescription:z.string().nullable(),diagnosis:z.string().nullable(),workPerformed:z.string().nullable(),partsUsed:z.string().nullable(),
  maintenanceCost:z.number().nonnegative(),downtimeHours:z.number().nonnegative(),conditionBefore:condition.nullable(),conditionAfter:condition.nullable(),
  resolution:z.string().nullable(),notes:z.string().nullable(),createdAt:z.string(),updatedAt:z.string(),archivedAt:z.string().nullable(),
  assetTag:z.string(),assetManufacturer:z.string(),assetModel:z.string(),assetSerialNumber:z.string().nullable(),assetStatus:z.string(),reporterName:z.string().nullable(),
});
