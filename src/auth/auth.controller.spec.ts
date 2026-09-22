import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<Record<keyof AuthService, any>>;

  const mockUser = {
    id: 'test-user-id',
    name: 'Faishal',
    email: 'faishal@example.com',
    phone: '+8801700000000',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthResponse = {
    access_token: 'jwt-access-token',
    user: mockUser,
  };

  beforeEach(async () => {
    authService = {
      register: vi.fn().mockResolvedValue(mockAuthResponse),
      login: vi.fn().mockResolvedValue(mockAuthResponse),
      getMe: vi.fn().mockResolvedValue(mockUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should call authService.register and return auth response', async () => {
      const registerDto = {
        name: 'Faishal',
        email: 'faishal@example.com',
        password: 'password123',
        phone: '+8801700000000',
      };

      const result = await controller.register(registerDto);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    it('should call authService.login and return auth response', async () => {
      const loginDto = {
        email: 'faishal@example.com',
        password: 'password123',
      };

      const result = await controller.login(loginDto);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('getMe', () => {
    it('should call authService.getMe with current user ID', async () => {
      const result = await controller.getMe('test-user-id');
      expect(authService.getMe).toHaveBeenCalledWith('test-user-id');
      expect(result).toEqual(mockUser);
    });
  });
});
