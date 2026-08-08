import bcrypt from 'bcryptjs';
import type { z } from 'zod';
import type { PasswordSchema } from 'shared';
import { AppError } from '../middleware/errorHandler';

const BCRYPT_ROUNDS = 12;

/** Centralized password hashing and verification service. */
export class PasswordService {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  ensureNotReused(currentPassword: string, newPassword: string): void {
    if (currentPassword === newPassword) {
      throw new AppError('New password must be different from current password', 400);
    }
  }
}

export type PasswordInput = z.infer<typeof PasswordSchema>;
