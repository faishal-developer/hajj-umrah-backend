import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtStrategy } from './jwt.strategy.js';
import { UsersService } from '../../users/users.service.js';
import { UserRole } from '../../users/enums/user-role.enum.js';
import { UserStatus } from '../../users/enums/user-status.enum.js';
import { User } from '../../users/entities/user.entity.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: Partial<Record<keyof UsersService, any>>;

  const mockUser: User = {
    id: 'user-uuid-1',
    name: 'Faishal',
    email: 'faishal@example.com',
    phone: null,
    passwordHash: 'hashedpassword',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      findById: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue('test-jwt-secret'),
          },
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should validate and return the user for an active user', async () => {
    usersService.findById.mockResolvedValue(mockUser);

    const result = await strategy.validate({
      sub: 'user-uuid-1',
      email: 'faishal@example.com',
      role: 'USER',
    });

    expect(usersService.findById).toHaveBeenCalledWith('user-uuid-1');
    expect(result).toEqual(mockUser);
  });

  it('should throw UnauthorizedException if user not found', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'nonexistent-uuid',
        email: 'nobody@example.com',
        role: 'USER',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is SUSPENDED', async () => {
    usersService.findById.mockResolvedValue(
      Object.assign({}, mockUser, { status: UserStatus.SUSPENDED }),
    );

    await expect(
      strategy.validate({
        sub: 'user-uuid-1',
        email: 'faishal@example.com',
        role: 'USER',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
