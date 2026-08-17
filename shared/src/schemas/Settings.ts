import { z } from 'zod';
import type { CreateAssetCategoryInput, UpdateAssetCategoryInput } from '../types/Asset';

/** Runtime schema for a settings category. */
export const SettingCategorySchema = z.enum(['ORGANIZATION', 'INVENTORY', 'ASSIGNMENTS', 'MAINTENANCE', 'REPORTS', 'SECURITY', 'EMAIL']);

/** Runtime schema for a setting's value type. */
export const SettingValueTypeSchema = z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']);

/** Runtime validation for updating a single setting's value. */
export const UpdateSettingInputSchema = z.object({
  value: z.string().max(2000, 'Value must be 2000 characters or fewer.'),
});

export type UpdateSettingInput = z.infer<typeof UpdateSettingInputSchema>;

/** Runtime validation for a batch settings update: category/key/value triples applied transactionally. */
export const BatchUpdateSettingsInputSchema = z.object({
  updates: z
    .array(
      z.object({
        category: SettingCategorySchema,
        key: z.string().min(1),
        value: z.string().max(2000, 'Value must be 2000 characters or fewer.'),
      }),
    )
    .min(1, 'At least one setting update is required.'),
});

export type BatchUpdateSettingsInput = z.infer<typeof BatchUpdateSettingsInputSchema>;

/** Runtime validation for creating an asset category from the Settings module. */
const createAssetCategoryShape = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(120),
  description: z.string().trim().max(500).optional().default(''),
  isActive: z.boolean().default(true),
});

export const CreateAssetCategoryInputSchema: z.ZodType<CreateAssetCategoryInput> = createAssetCategoryShape;

/** Runtime validation for updating an asset category. */
export const UpdateAssetCategoryInputSchema: z.ZodType<UpdateAssetCategoryInput> =
  createAssetCategoryShape.partial();

