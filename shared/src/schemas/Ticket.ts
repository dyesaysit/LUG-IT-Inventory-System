import { z } from 'zod';

const optionalText = (max: number) => z.union([z.string().trim().max(max), z.literal(''), z.null()]).optional();

export const CreateTicketInputSchema = z.object({
  title: z.string().trim().min(3, 'Please give the ticket a short title').max(200),
  description: optionalText(2000),
  assetId: z.coerce.number().int().positive().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

export const AssignTicketInputSchema = z.object({
  assignedTo: z.string().trim().min(1, 'Enter who this is assigned to').max(120),
});

export const CompleteTicketInputSchema = z.object({
  resolution: z.string().trim().min(3, 'Please describe how it was resolved').max(2000),
});

export const ConvertTicketInputSchema = z.object({
  kind: z.enum(['MAINTENANCE', 'REPAIR']),
  maintenanceType: z.enum(['CORRECTIVE', 'PREVENTIVE', 'INSPECTION', 'UPGRADE', 'WARRANTY_SERVICE', 'OTHER']).optional(),
  repairType: z.enum(['INTERNAL', 'EXTERNAL', 'WARRANTY', 'EMERGENCY', 'OTHER']).optional(),
});

export const TicketListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assetId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'status', 'priority', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
