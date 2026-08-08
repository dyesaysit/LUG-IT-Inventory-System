import crypto from 'node:crypto';
import { ChangePasswordInputSchema, LoginInputSchema, PasswordSchema } from 'shared';
import type { AuthenticatedUser, ChangePasswordInput, LoginInput, LoginResponse, SafeUser } from 'shared';
import { ACCOUNT_LOCK_MINUTES, DEFAULT_SESSION_HOURS, MAX_FAILED_LOGINS, REMEMBER_ME_SESSION_DAYS, SESSION_LAST_USED_THROTTLE_SECONDS } from '../auth/constants';
import { AppError } from '../middleware/errorHandler';
import type { IRoleRepository } from '../repositories/RoleRepository';
import type { ISessionRepository } from '../repositories/SessionRepository';
import type { IUserRepository } from '../repositories/UserRepository';
import type { IAuditService } from './AuditService';
import type { PasswordService } from './PasswordService';

export interface AuthSessionResult {
  user: SafeUser;
  permissions: string[];
  token: string;
  expiresAt: Date;
}

interface AuthenticatedContext {
  auth: AuthenticatedUser;
  safeUser: SafeUser;
  sessionId: number;
}

const toSafeUser = (user: {
  id: number;
  personId: number | null;
  username: string;
  email: string | null;
  roleId: number;
  roleCode: string;
  roleName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  personName: string | null;
}): SafeUser => ({
  id: user.id,
  personId: user.personId,
  username: user.username,
  email: user.email,
  roleId: user.roleId,
  roleCode: user.roleCode,
  roleName: user.roleName,
  isActive: user.isActive,
  mustChangePassword: user.mustChangePassword,
  lockedUntil: user.lockedUntil,
  lastLoginAt: user.lastLoginAt,
  passwordChangedAt: user.passwordChangedAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  archivedAt: user.archivedAt,
  personName: user.personName,
});

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

const nowUtc = (): Date => new Date();

export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly roles: IRoleRepository,
    private readonly sessions: ISessionRepository,
    private readonly passwords: PasswordService,
    private readonly audit: IAuditService,
  ) {}

  private async buildAuthContext(userId: number): Promise<AuthenticatedContext> {
    const user = await this.users.getUserById(userId);
    if (!user || !user.isActive || user.archivedAt) {
      throw new AppError('Unauthorized', 401);
    }

    const permissions = (await this.roles.listPermissionsForRole(user.roleId)).map((permission) => permission.code);
    const safeUser = toSafeUser(user);

    return {
      auth: {
        userId: user.id,
        username: user.username,
        roleId: user.roleId,
        roleCode: user.roleCode,
        mustChangePassword: user.mustChangePassword,
        permissions,
      },
      safeUser,
      sessionId: 0,
    };
  }

  async login(input: LoginInput, context: { ipAddress: string | null; userAgent: string | null }): Promise<AuthSessionResult> {
    const parsed = LoginInputSchema.parse(input);
    const found = await this.users.getUserWithPasswordByIdentity(parsed.identity);

    if (!found) {
      await this.audit.record({
        entityType: 'SYSTEM',
        entityId: null,
        action: 'LOGIN',
        success: false,
        summary: 'Failed login attempt with unknown identity',
        performedBy: null,
        performedByName: parsed.identity,
      });
      throw new AppError('Invalid username or password.', 401);
    }

    const { user, passwordHash } = found;

    if (user.archivedAt || !user.isActive) {
      await this.audit.record({
        entityType: 'SYSTEM',
        entityId: user.id,
        action: 'LOGIN',
        success: false,
        summary: `Rejected login for inactive or archived user ${user.username}`,
        performedBy: String(user.id),
        performedByName: user.username,
      });
      throw new AppError('Invalid username or password.', 401);
    }

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      throw new AppError('Account is temporarily locked. Try again later.', 423);
    }

    const matches = await this.passwords.verify(parsed.password, passwordHash);
    if (!matches) {
      await this.users.recordFailedLogin(user.id);
      const fresh = await this.users.getUserById(user.id);
      if (fresh && fresh.failedLoginAttempts >= MAX_FAILED_LOGINS) {
        const lockedUntil = new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000).toISOString();
        await this.users.lockUser(user.id, lockedUntil);
      }
      await this.audit.record({
        entityType: 'SYSTEM',
        entityId: user.id,
        action: 'LOGIN',
        success: false,
        summary: `Failed login attempt for user ${user.username}`,
        performedBy: String(user.id),
        performedByName: user.username,
      });
      throw new AppError('Invalid username or password.', 401);
    }

    await this.users.recordSuccessfulLogin(user.id);

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const expiresAt = nowUtc();
    if (parsed.rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + REMEMBER_ME_SESSION_DAYS);
    } else {
      expiresAt.setHours(expiresAt.getHours() + DEFAULT_SESSION_HOURS);
    }

    await this.sessions.createSession({
      userId: user.id,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const authContext = await this.buildAuthContext(user.id);

    await this.audit.record({
      entityType: 'SYSTEM',
      entityId: user.id,
      action: 'LOGIN',
      success: true,
      summary: `Successful login for user ${user.username}`,
      performedBy: String(user.id),
      performedByName: user.username,
    });

    return {
      user: authContext.safeUser,
      permissions: authContext.auth.permissions,
      token,
      expiresAt,
    };
  }

  async authenticateSession(rawToken: string | undefined): Promise<AuthenticatedContext | null> {
    if (!rawToken) {
      return null;
    }

    const tokenHash = hashToken(rawToken);
    const active = await this.sessions.findActiveSessionByTokenHash(tokenHash);
    if (!active) {
      return null;
    }

    const user = await this.users.getUserById(active.session.userId);
    if (!user || !user.isActive || user.archivedAt) {
      await this.sessions.revokeSession(active.session.id);
      return null;
    }

    const permissions = (await this.roles.listPermissionsForRole(user.roleId)).map((permission) => permission.code);
    const lastUsedAtMs = new Date(active.session.lastUsedAt).getTime();
    if (Date.now() - lastUsedAtMs >= SESSION_LAST_USED_THROTTLE_SECONDS * 1000) {
      await this.sessions.updateLastUsed(active.session.id);
    }

    return {
      auth: {
        userId: user.id,
        username: user.username,
        roleId: user.roleId,
        roleCode: user.roleCode,
        mustChangePassword: user.mustChangePassword,
        permissions,
      },
      safeUser: toSafeUser(user),
      sessionId: active.session.id,
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }
    const active = await this.sessions.findActiveSessionByTokenHash(hashToken(rawToken));
    if (!active) {
      return;
    }
    await this.sessions.revokeSession(active.session.id);
    await this.audit.record({
      entityType: 'SYSTEM',
      entityId: active.session.userId,
      action: 'LOGOUT',
      success: true,
      summary: `User ${active.session.userId} logged out`,
      performedBy: String(active.session.userId),
      performedByName: `user:${active.session.userId}`,
    });
  }

  async logoutAll(currentUserId: number): Promise<void> {
    await this.sessions.revokeAllUserSessions(currentUserId);
    await this.audit.record({
      entityType: 'SYSTEM',
      entityId: currentUserId,
      action: 'LOGOUT',
      success: true,
      summary: `User ${currentUserId} logged out from all devices`,
      performedBy: String(currentUserId),
      performedByName: `user:${currentUserId}`,
    });
  }

  async changePassword(userId: number, input: ChangePasswordInput): Promise<void> {
    const parsed = ChangePasswordInputSchema.parse(input);
    const current = await this.users.getUserById(userId);
    if (!current) {
      throw new AppError('User not found', 404);
    }

    const withPassword = await this.users.getUserWithPasswordByIdentity(current.username);
    if (!withPassword) {
      throw new AppError('User not found', 404);
    }

    const currentValid = await this.passwords.verify(parsed.currentPassword, withPassword.passwordHash);
    if (!currentValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    this.passwords.ensureNotReused(parsed.currentPassword, parsed.newPassword);
    PasswordSchema.parse(parsed.newPassword);

    const newHash = await this.passwords.hash(parsed.newPassword);
    await this.users.updatePasswordHash(userId, newHash, false);
    await this.sessions.revokeAllUserSessions(userId);
    await this.audit.record({
      entityType: 'SYSTEM',
      entityId: userId,
      action: 'UPDATE',
      success: true,
      summary: `Password changed for user ${current.username}`,
      performedBy: String(userId),
      performedByName: current.username,
    });
  }

  async resetPasswordByAdministrator(targetUserId: number, newPassword: string, actingUserId: number): Promise<void> {
    PasswordSchema.parse(newPassword);
    const targetUser = await this.users.getUserById(targetUserId);
    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    const hash = await this.passwords.hash(newPassword);
    await this.users.updatePasswordHash(targetUserId, hash, true);
    await this.sessions.revokeAllUserSessions(targetUserId);

    await this.audit.record({
      entityType: 'SYSTEM',
      entityId: targetUserId,
      action: 'UPDATE',
      success: true,
      summary: `Administrator ${actingUserId} reset password for user ${targetUser.username}`,
      performedBy: String(actingUserId),
      performedByName: `user:${actingUserId}`,
    });
  }

  async revokeAllSessions(targetUserId: number, actingUserId: number): Promise<void> {
    await this.sessions.revokeAllUserSessions(targetUserId);
    await this.audit.record({
      entityType: 'SYSTEM',
      entityId: targetUserId,
      action: 'UPDATE',
      success: true,
      summary: `Administrator ${actingUserId} revoked all sessions for user ${targetUserId}`,
      performedBy: String(actingUserId),
      performedByName: `user:${actingUserId}`,
    });
  }

  async getCurrentUser(userId: number): Promise<LoginResponse> {
    const context = await this.buildAuthContext(userId);
    return {
      user: context.safeUser,
      permissions: context.auth.permissions,
    };
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.sessions.deleteOrArchiveExpiredSessions();
  }
}
