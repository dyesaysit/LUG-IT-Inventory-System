export interface Permission {
  id: number;
  code: string;
  name: string;
  description: string | null;
  module: string;
  createdAt: string;
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface User {
  id: number;
  personId: number | null;
  username: string;
  email: string | null;
  roleId: number;
  roleCode: string;
  roleName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  personName: string | null;
}

export type SafeUser = Omit<User, 'failedLoginAttempts'>;

export interface AuthSession {
  id: number;
  userId: number;
  expiresAt: string;
  lastUsedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface AuthenticatedUser {
  userId: number;
  username: string;
  roleId: number;
  roleCode: string;
  mustChangePassword: boolean;
  permissions: string[];
}

export interface LoginInput {
  identity: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: SafeUser;
  permissions: string[];
}

export interface InitialSetupInput {
  username: string;
  password: string;
  confirmPassword: string;
  systemName: string;
  institutionName: string;
  institutionShortName: string;
  logoDataUrl?: string;
}

export interface InitialSetupStatus {
  setupRequired: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface CreateUserInput {
  personId?: number | null;
  username: string;
  email?: string | null;
  roleId: number;
  temporaryPassword: string;
  confirmTemporaryPassword: string;
  isActive?: boolean;
}

export interface UpdateUserInput {
  personId?: number | null;
  email?: string | null;
  roleId?: number;
  isActive?: boolean;
  mustChangePassword?: boolean;
}

export interface ResetPasswordInput {
  newTemporaryPassword: string;
  confirmTemporaryPassword: string;
}

export interface UserListQuery {
  search?: string;
  roleId?: number;
  isActive?: boolean;
  lockedOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'username' | 'email' | 'role' | 'isActive' | 'lockedUntil' | 'lastLoginAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
