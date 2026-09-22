import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { RefundsController } from './refunds.controller.js';
import { CancellationsService } from './cancellations.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('RefundsController', () => {
  let controller: RefundsController;
  let service: CancellationsService;

  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'user@example.com',
    phone: null,
    passwordHash: 'hashed',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    findRefundsForUser: vi.fn(),
    findRefundByIdAndValidateOwnership: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefundsController],
      providers: [
        {
          provide: CancellationsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RefundsController>(RefundsController);
    service = module.get<CancellationsService>(CancellationsService);
  });

  it('getMyRefunds should derive user ID from authenticated user', async () => {
    mockService.findRefundsForUser.mockResolvedValue([]);
    await controller.getMyRefunds(mockUser);
    expect(mockService.findRefundsForUser).toHaveBeenCalledWith('user-123');
  });

  it('getRefunds should derive user ID from authenticated user', async () => {
    mockService.findRefundsForUser.mockResolvedValue([]);
    await controller.getRefunds(mockUser);
    expect(mockService.findRefundsForUser).toHaveBeenCalledWith('user-123');
  });

  it('getRefund should validate refund ownership', async () => {
    mockService.findRefundByIdAndValidateOwnership.mockResolvedValue({ id: 'r-1' });
    const result = await controller.getRefund('r-1', mockUser);
    expect(mockService.findRefundByIdAndValidateOwnership).toHaveBeenCalledWith(
      'r-1',
      mockUser,
    );
    expect(result).toEqual({ id: 'r-1' });
  });
});
