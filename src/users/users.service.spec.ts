import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { UserRole } from './enums/user-role.enum.js';
import { UserStatus } from './enums/user-status.enum.js';

describe('UsersService', () => {
  let service: UsersService;
  let repo: Partial<Record<keyof Repository<User>, any>>;

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
    repo = {
      findOne: vi.fn(),
      count: vi.fn(),
      create: vi.fn().mockImplementation((dto) => dto as User),
      save: vi.fn().mockImplementation((user) => Promise.resolve(Object.assign({}, mockUser, user))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should find user by id', async () => {
    repo.findOne.mockResolvedValue(mockUser);

    const user = await service.findById('user-uuid-1');
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'user-uuid-1' } });
    expect(user).toEqual(mockUser);
  });

  it('should find user by lowercase email', async () => {
    repo.findOne.mockResolvedValue(mockUser);

    const user = await service.findByEmail('FAISHAL@EXAMPLE.COM');
    expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'faishal@example.com' } });
    expect(user).toEqual(mockUser);
  });

  it('should check if user exists by email', async () => {
    repo.count.mockResolvedValue(1);

    const exists = await service.existsByEmail('faishal@example.com');
    expect(exists).toBe(true);
  });

  it('should create a new user with lowercase email', async () => {
    const newUser = await service.create({
      name: 'Faishal',
      email: 'FAISHAL@EXAMPLE.COM',
      passwordHash: 'hash',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'faishal@example.com',
      }),
    );
    expect(repo.save).toHaveBeenCalled();
    expect(newUser).toBeDefined();
  });
});
