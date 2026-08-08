import { z } from 'zod';

/** Validates a staff equipment request. */
export const CreateEquipmentRequestInputSchema = z.object({
  itemName: z.string().trim().min(2, 'Please describe the item').max(200),
  category: z.union([z.string().trim().max(80), z.literal(''), z.null()]).optional(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(999).default(1),
  justification: z.union([z.string().trim().max(1000), z.literal(''), z.null()]).optional(),
});

/** Validates a staff problem report against an assigned asset. */
export const ReportProblemInputSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  faultDescription: z.string().trim().min(3, 'Please describe the problem').max(1000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

/** Notes for an approve / reject / more-information review action. */
export const ReviewRequestInputSchema = z.object({
  notes: z.union([z.string().trim().max(1000), z.literal(''), z.null()]).optional(),
});

/** Fulfilment: the available asset to assign to the requester. */
export const FulfilRequestInputSchema = z.object({
  assetId: z.coerce.number().int().positive(),
  notes: z.union([z.string().trim().max(1000), z.literal(''), z.null()]).optional(),
});

export const EquipmentRequestListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  sortBy: z.enum(['createdAt', 'status', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
