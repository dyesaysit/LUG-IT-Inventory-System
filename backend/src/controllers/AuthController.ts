import type { Request } from 'express';
import type { ChangePasswordInput, LoginInput } from 'shared';
import type { AuthService } from '../services/AuthService';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login(input: LoginInput, request: Request) {
    const forwardedFor = request.socket.remoteAddress ?? null;
    return this.authService.login(input, {
      ipAddress: forwardedFor,
      userAgent: request.get('user-agent') ?? null,
    });
  }

  logout(token: string | undefined) {
    return this.authService.logout(token);
  }

  logoutAll(userId: number) {
    return this.authService.logoutAll(userId);
  }

  me(userId: number) {
    return this.authService.getCurrentUser(userId);
  }

  changePassword(userId: number, input: ChangePasswordInput) {
    return this.authService.changePassword(userId, input);
  }
}
