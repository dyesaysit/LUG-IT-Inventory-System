import type { CreateUserInput, ResetPasswordInput, UpdateUserInput, UserListQuery } from 'shared';
import type { UserService } from '../services/UserService';

export class UserController {
  constructor(private readonly users: UserService) {}

  list(query: UserListQuery) {
    return this.users.listUsers(query);
  }

  getById(id: number) {
    return this.users.getUserById(id);
  }

  create(input: CreateUserInput, actingUserId: number) {
    return this.users.createUser(input, actingUserId);
  }

  update(id: number, input: UpdateUserInput, actingUserId: number) {
    return this.users.updateUser(id, input, actingUserId);
  }

  deactivate(id: number, actingUserId: number) {
    return this.users.deactivateUser(id, actingUserId);
  }

  reactivate(id: number, actingUserId: number) {
    return this.users.reactivateUser(id, actingUserId);
  }

  resetPassword(id: number, input: ResetPasswordInput, actingUserId: number) {
    return this.users.resetPassword(id, input, actingUserId);
  }

  revokeSessions(id: number, actingUserId: number) {
    return this.users.revokeSessions(id, actingUserId);
  }

  unlock(id: number, actingUserId: number) {
    return this.users.unlockUser(id, actingUserId);
  }

  listRoles() {
    return this.users.listRoles();
  }

  listPermissions() {
    return this.users.listPermissions();
  }
}
