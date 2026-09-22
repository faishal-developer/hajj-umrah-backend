import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

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
    findForUser: vi.fn(),
    findByBookingAndValidateOwnership: vi.fn(),
    findByIdAndValidateOwnership: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('getMyPayments should derive user ID from authenticated user', async () => {
    mockService.findForUser.mockResolvedValue([]);
    await controller.getMyPayments(mockUser);
    expect(mockService.findForUser).toHaveBeenCalledWith('user-123');
  });

  it('getPayments should derive user ID from authenticated user', async () => {
    mockService.findForUser.mockResolvedValue([]);
    await controller.getPayments(mockUser);
    expect(mockService.findForUser).toHaveBeenCalledWith('user-123');
  });

  it('getPaymentsByBooking should validate booking ownership', async () => {
    mockService.findByBookingAndValidateOwnership.mockResolvedValue([]);
    await controller.getPaymentsByBooking('booking-123', mockUser);
    expect(mockService.findByBookingAndValidateOwnership).toHaveBeenCalledWith(
      'booking-123',
      mockUser,
    );
  });

  it('getPayment should validate payment ownership', async () => {
    mockService.findByIdAndValidateOwnership.mockResolvedValue({ id: 'p-1' });
    const result = await controller.getPayment('p-1', mockUser);
    expect(mockService.findByIdAndValidateOwnership).toHaveBeenCalledWith(
      'p-1',
      mockUser,
    );
    expect(result).toEqual({ id: 'p-1' });
  });
});
