import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { User } from '../users/entities/user.entity.js';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<Record<keyof UsersService, any>>;
  let jwtService: Partial<Record<keyof JwtService, any>>;

  const mockUser: User = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Faishal',
    email: 'faishal@example.com',
    phone: '+8801700000000',
    passwordHash: '',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockUser.passwordHash = await bcrypt.hash('password123', 10);

    usersService = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      existsByEmail: vi.fn(),
      create: vi.fn(),
    };

    jwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user with USER role and return access_token and user profile', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation((userData: Partial<User>) =>
        Promise.resolve(
          Object.assign({}, mockUser, userData, { id: 'new-uuid' }) as User,
        ),
      );

      const result = await authService.register({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        phone: '+8801900000000',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New User',
          email: 'newuser@example.com',
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
        }),
      );
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.role).toBe(UserRole.USER);
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should throw ConflictException if email is already taken', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          name: 'Duplicate User',
          email: 'faishal@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials and return access_token', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      const result = await authService.login({
        email: 'faishal@example.com',
        password: 'password123',
      });

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.role).toBe(UserRole.USER);
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.login({
          email: 'faishal@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user account is suspended', async () => {
      usersService.findByEmail.mockResolvedValue(
        Object.assign({}, mockUser, { status: UserStatus.SUSPENDED }),
      );

      await expect(
        authService.login({
          email: 'faishal@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('should return user profile without passwordHash for valid user ID', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await authService.getMe(mockUser.id);

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(authService.getMe('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
