import { z } from 'zod';

const optionalText = (maximum: number) => z.string().trim().max(maximum).nullable().optional();
const optionalEmail = z.union([z.string().trim().email().max(254), z.literal(''), z.null()]).optional();

/** Runtime schema for a department returned by the API. */
export const DepartmentSchema = z.object({
  id: z.number().int().positive(),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  description: z.string().nullable(),
  headOfDepartment: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
});

/** Runtime validation for department creation. */
export const CreateDepartmentInputSchema = z.object({
  code: z.string().trim().min(1, 'Department code is required').max(20),
  name: z.string().trim().min(1, 'Department name is required').max(120),
  description: optionalText(1000),
  headOfDepartment: optionalText(120),
  email: optionalEmail,
  phone: optionalText(40),
  isActive: z.boolean().default(true),
});

/** Runtime validation for department updates. */
export const UpdateDepartmentInputSchema = CreateDepartmentInputSchema.partial();

/** Runtime validation for department list filters. */
export const DepartmentListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  isActive: z.preprocess(
    (value) => value === 'true' ? true : value === 'false' ? false : value,
    z.boolean().optional(),
  ),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['code', 'name', 'headOfDepartment', 'isActive', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
