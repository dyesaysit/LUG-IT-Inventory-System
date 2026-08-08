import { z } from 'zod';

export const UsernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be at most 50 characters')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only include letters, numbers, dot, underscore, and hyphen');

export const PasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter')
  .regex(/[0-9]/, 'Password must include at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must include at least one special character');

export const LoginInputSchema = z.object({
  identity: z.string().trim().min(1, 'Username or email is required').max(254),
  password: z.string().min(1, 'Password is required').max(128),
  rememberMe: z.boolean().optional(),
});

export const ChangePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(128),
    newPassword: PasswordSchema,
    confirmNewPassword: z.string().min(1, 'Confirm password is required').max(128),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmNewPassword'],
  });

const optionalEmail = z.union([z.string().trim().email().max(254), z.literal(''), z.null()]).optional();

export const CreateUserInputSchema = z
  .object({
    personId: z.coerce.number().int().positive().nullable().optional(),
    username: UsernameSchema,
    email: optionalEmail,
    roleId: z.coerce.number().int().positive(),
    temporaryPassword: PasswordSchema,
    confirmTemporaryPassword: z.string().min(1).max(128),
    isActive: z.boolean().default(true),
  })
  .refine((value) => value.temporaryPassword === value.confirmTemporaryPassword, {
    message: 'Temporary password and confirmation do not match',
    path: ['confirmTemporaryPassword'],
  });

export const UpdateUserInputSchema = z.object({
  personId: z.coerce.number().int().positive().nullable().optional(),
  email: optionalEmail,
  roleId: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
});

export const ResetPasswordInputSchema = z
  .object({
    newTemporaryPassword: PasswordSchema,
    confirmTemporaryPassword: z.string().min(1).max(128),
  })
  .refine((value) => value.newTemporaryPassword === value.confirmTemporaryPassword, {
    message: 'Temporary password and confirmation do not match',
    path: ['confirmTemporaryPassword'],
  });

export const UserListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  roleId: z.coerce.number().int().positive().optional(),
  isActive: z.preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z.boolean().optional(),
  ),
  lockedOnly: z.preprocess(
    (value) => (value === 'true' ? true : value === 'false' ? false : value),
    z.boolean().optional(),
  ),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z
    .enum(['username', 'email', 'role', 'isActive', 'lockedUntil', 'lastLoginAt', 'updatedAt'])
    .default('username'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
