import { z } from 'zod';

/** Runtime schema for controlled employment statuses. */
export const EmploymentStatusSchema = z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'LEFT']);

const optionalText = (maximum: number) => z.string().trim().max(maximum).nullable().optional();
const optionalEmail = z.union([z.string().trim().email().max(254), z.literal(''), z.null()]).optional();

/** Runtime schema for a Person API response. */
export const PersonSchema = z.object({
  id: z.number().int().positive(),
  staffId: z.string().trim().min(1).max(30),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  jobTitle: z.string().nullable(),
  departmentId: z.number().int().positive().nullable(),
  employmentStatus: EmploymentStatusSchema,
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
});

/** Runtime validation for person creation. */
export const CreatePersonInputSchema = z.object({
  staffId: z.string().trim().min(1, 'Staff ID is required').max(30),
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: optionalEmail,
  phone: optionalText(40),
  jobTitle: optionalText(120),
  departmentId: z.number().int().positive().nullable().optional(),
  employmentStatus: EmploymentStatusSchema.default('ACTIVE'),
  notes: optionalText(2000),
  isActive: z.boolean().default(true),
});

/** Runtime validation for partial person updates. */
export const UpdatePersonInputSchema = CreatePersonInputSchema.partial();

/** Runtime validation for People list parameters. */
export const PersonListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  employmentStatus: EmploymentStatusSchema.optional(),
  isActive: z.preprocess(
    (value) => value === 'true' ? true : value === 'false' ? false : value,
    z.boolean().optional(),
  ),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['staffId', 'firstName', 'lastName', 'jobTitle', 'employmentStatus', 'updatedAt']).default('lastName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
