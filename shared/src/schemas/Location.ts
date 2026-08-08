import { z } from 'zod';

const optionalText = (maximum: number) => z.string().trim().max(maximum).nullable().optional();

/** Runtime schema for a Location API response. */
export const LocationSchema = z.object({
  id: z.number().int().positive(),
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(120),
  building: z.string().trim().min(1).max(120),
  floor: z.string().nullable(),
  room: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
});

/** Runtime validation for location creation. */
export const CreateLocationInputSchema = z.object({
  code: z.string().trim().min(1, 'Location code is required').max(30),
  name: z.string().trim().min(1, 'Location name is required').max(120),
  building: z.string().trim().min(1, 'Building is required').max(120),
  floor: optionalText(40),
  room: optionalText(40),
  description: optionalText(1000),
  isActive: z.boolean().default(true),
});

/** Runtime validation for partial location updates. */
export const UpdateLocationInputSchema = CreateLocationInputSchema.partial();

/** Runtime validation for location list parameters. */
export const LocationListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  building: z.string().trim().max(120).optional(),
  isActive: z.preprocess(
    (value) => value === 'true' ? true : value === 'false' ? false : value,
    z.boolean().optional(),
  ),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['code', 'name', 'building', 'floor', 'room', 'isActive', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
