import { CreateUserInputSchema, ResetPasswordInputSchema, UpdateUserInputSchema, UserListQuerySchema } from 'shared';
import type { CreateUserInput, ResetPasswordInput, UpdateUserInput, UserListQuery } from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { IPermissionRepository } from '../repositories/PermissionRepository';
import type { IRoleRepository } from '../repositories/RoleRepository';
import type { IUserRepository } from '../repositories/UserRepository';
import type { AuthService } from './AuthService';
import type { IAuditService } from './AuditService';
import type { PasswordService } from './PasswordService';

export class UserService {
  constructor(
    private readonly users: IUserRepository,
    private readonly roles: IRoleRepository,
    private readonly permissions: IPermissionRepository,
    private readonly passwords: PasswordService,
    private readonly authService: AuthService,
    private readonly audit: IAuditService,
  ) {}

  listUsers(query: UserListQuery) {
    return this.users.listUsers(UserListQuerySchema.parse(query));
  }

  async getUserById(id: number) {
    const user = await this.users.getUserById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  listRoles() {
    return this.roles.listRoles();
  }

  listPermissions() {
    return this.permissions.listPermissions();
  }

  async createUser(input: CreateUserInput, actingUserId: number) {
    const parsed = CreateUserInputSchema.parse(input);

    if (await this.users.checkDuplicateUsername(parsed.username)) {
      throw new AppError('Username already exists', 409);
    }
    if (parsed.email && (await this.users.checkDuplicateEmail(parsed.email))) {
      throw new AppError('Email already exists', 409);
    }

    const role = await this.roles.getRoleById(parsed.roleId);
    if (!role || !role.isActive || role.archivedAt) {
      throw new AppError('Role not found or inactive', 400);
    }

    const passwordHash = await this.passwords.hash(parsed.temporaryPassword);
    const created = await this.users.createUser(parsed, passwordHash);

    await this.audit.record({
      entityType: 'SYSTEM',
      entityId: created.id,
      action: 'CREATE',
      success: true,
      summary: `User ${created.username} created by ${actingUserId}`,
      performedBy: String(actingUserId),
      performedByName: `user:${actingUserId}`,
    });

    return created;
  }

  async updateUser(id: number, input: UpdateUserInput, actingUserId: number) {
    const parsed = UpdateUserInputSchema.parse(input);
    const current = await this.users.getUserById(id);
    if (!current) {
      throw new AppError('User not found', 404);
    }

    if (parsed.email && (await this.users.checkDuplicateEmail(parsed.email, id))) {
      throw new AppError('Email already exists', 409);
    }

    if (parsed.roleId) {
      const role = await this.roles.getRoleById(parsed.roleId);
      if (!role || !role.isActive || role.archivedAt) {
        throw new AppError('Role not found or inactive', 400);
      }
    }

    const updated = await this.users.updateUser(id, parsed);

    await this.audit.record({
      entityType: 'SYSTEM',
      entityId: updated.id,
      action: 'UPDATE',
      success: true,
      summary: `User ${updated.username} updated by ${actingUserId}`,
      performedBy: String(actingUserId),
      performedByName: `user:${actingUserId}`,
    });

    return updated;
  }

  async deactivateUser(id: number, actingUserId: number) {
    const target = await this.users.getUserById(id);
    if (!target) {
      throw new AppError('User not found', 404);
    }

    if (target.roleCode === 'SYSTEM_ADMINISTRATOR') {
      const adminCount = await this.users.countActiveSystemAdministrators();
      if (target.isActive && adminCount <= 1) {
        throw new AppError('Cannot deactivate the final active System Administrator', 400);
      }
    }

    await this.users.deactivateUser(id);
    await this.authService.revokeAllSessions(id, actingUserId);

    await this.audit.record({
      entityType: 'SYSTEM',
      entityId: id,
      action: 'ARCHIVE',
      success: true,
      summary: `User ${target.username} deactivated by ${actingUserId}`,
      performedBy: String(actingUserId),
      performedByName: `user:${actingUserId}`,
    });
  }

  async reactivateUser(id: number, actingUserId: number) {
    const target = await this.users.getUserById(id);
    if (!target) {
      throw new AppError('User not found', 404);
    }

    await this.users.reactivateUser(id);

    await this.audit.record({
      entityType: 'SYSTEM',
      entityId: id,
      action: 'RESTORE',
      success: true,
      summary: `User ${target.username} reactivated by ${actingUserId}`,
      performedBy: String(actingUserId),
      performedByName: `user:${actingUserId}`,
    });
  }

  async resetPassword(id: number, input: ResetPasswordInput, actingUserId: number) {
    const parsed = ResetPasswordInputSchema.parse(input);
    await this.authService.resetPasswordByAdministrator(id, parsed.newTemporaryPassword, actingUserId);
  }

  async revokeSessions(id: number, actingUserId: number) {
    await this.authService.revokeAllSessions(id, actingUserId);
  }

  async unlockUser(id: number, actingUserId: number) {
    const target = await this.users.getUserById(id);
    if (!target) {
      throw new AppError('User not found', 404);
    }

    await this.users.resetFailedLoginAttempts(id);

    await this.audit.record({
      entityType: 'SYSTEM',
      entityId: id,
      action: 'UPDATE',
      success: true,
      summary: `User ${target.username} unlocked by ${actingUserId}`,
      performedBy: String(actingUserId),
      performedByName: `user:${actingUserId}`,
    });

    return this.getUserById(id);
  }
}
