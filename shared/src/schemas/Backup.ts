import { z } from 'zod';

/** Runtime schema for backup type. */
export const BackupTypeSchema = z.enum(['MANUAL', 'AUTOMATIC', 'PRE_RESTORE', 'PRE_UPDATE']);

/** Runtime schema for backup status. */
export const BackupStatusSchema = z.enum(['PENDING', 'COMPLETED', 'FAILED', 'VERIFIED', 'CORRUPT']);

/**
 * Runtime validation for a backup restore request. Requires the caller to
 * type the literal word "RESTORE" to guard against accidental data loss.
 */
export const RestoreBackupInputSchema = z.object({
  confirmation: z
    .string()
    .refine((value) => value === 'RESTORE', { message: 'You must type RESTORE to confirm this action.' }),
});

export type RestoreBackupInput = z.infer<typeof RestoreBackupInputSchema>;
