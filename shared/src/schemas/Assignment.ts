import { z } from 'zod';

const date = z.string().date();
const nullableId = z.number().int().positive().nullable().optional();
const optionalText = z.string().trim().max(2000).nullable().optional();

/** Runtime schema for assignment target types. */
export const AssignmentTypeSchema = z.enum(['PERSON', 'DEPARTMENT', 'LOCATION']);
/** Runtime schema for assignment lifecycle states. */
export const AssignmentStatusSchema = z.enum(['ACTIVE', 'RETURNED', 'OVERDUE', 'CANCELLED']);

const targetFields = {
  assignmentType: AssignmentTypeSchema, personId: nullableId,
  departmentId: nullableId, locationId: nullableId,
};
const hasValidTarget = (input: {
  assignmentType: 'PERSON' | 'DEPARTMENT' | 'LOCATION';
  personId?: number | null; departmentId?: number | null; locationId?: number | null;
}) => (input.assignmentType === 'PERSON' && input.personId != null && input.departmentId == null && input.locationId == null)
  || (input.assignmentType === 'DEPARTMENT' && input.departmentId != null && input.personId == null && input.locationId == null)
  || (input.assignmentType === 'LOCATION' && input.locationId != null && input.personId == null && input.departmentId == null);

/** Runtime validation for assignment creation. */
export const CreateAssignmentInputSchema = z.object({
  assetId: z.number().int().positive(), ...targetFields,
  assignedDate: date, expectedReturnDate: date.nullable().optional(),
  purpose: optionalText, notes: optionalText, assignedBy: z.string().trim().max(120).nullable().optional(),
}).refine(hasValidTarget, { message: 'Assignment target must match assignment type' })
  .refine((input) => !input.expectedReturnDate || input.expectedReturnDate >= input.assignedDate,
    { message: 'Expected return date cannot be before assigned date', path: ['expectedReturnDate'] });

/** Runtime validation for returning an assignment. */
export const ReturnAssignmentInputSchema = z.object({
  returnedDate: date, returnLocationId: nullableId,
  conditionOnReturn: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']).optional(),
  returnNotes: optionalText, returnedBy: z.string().trim().max(120).nullable().optional(),
});

/** Runtime validation for editable assignment fields. */
export const UpdateAssignmentInputSchema = z.object({
  expectedReturnDate: date.nullable().optional(), purpose: optionalText, notes: optionalText,
});

/** Runtime validation for assignment list filters. */
export const AssignmentListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(), assetId: z.coerce.number().int().positive().optional(),
  assignmentType: AssignmentTypeSchema.optional(), status: AssignmentStatusSchema.optional(),
  personId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  assignedFrom: date.optional(), assignedTo: date.optional(),
  overdueOnly: z.preprocess((value) => value === 'true' ? true : value === 'false' ? false : value, z.boolean().optional()),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['assignedDate', 'expectedReturnDate', 'status', 'updatedAt']).default('assignedDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** Runtime schema for an assignment response. */
export const AssignmentSchema = z.object({
  id: z.number().int().positive(), assetId: z.number().int().positive(), ...targetFields,
  assignedDate: date, expectedReturnDate: date.nullable(), returnedDate: date.nullable(),
  status: AssignmentStatusSchema, purpose: z.string().nullable(), notes: z.string().nullable(),
  assignedBy: z.string().nullable(), returnedBy: z.string().nullable(),
  createdAt: z.string(), updatedAt: z.string(), archivedAt: z.string().nullable(),
  assetTag: z.string(), assetManufacturer: z.string(), assetModel: z.string(),
  personName: z.string().nullable(), departmentName: z.string().nullable(),
  locationName: z.string().nullable(), locationCode: z.string().nullable(),
});
