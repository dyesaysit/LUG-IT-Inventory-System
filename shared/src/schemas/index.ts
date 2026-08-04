import { z } from 'zod';

// Barrel for validation schemas

export * from './Asset';

/**
 * Generic query parameters for list endpoints.
 */
export const queryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
});

export type QueryParamsInput = z.infer<typeof queryParamsSchema>;