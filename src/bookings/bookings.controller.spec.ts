import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PaymentMode } from './enums/payment-mode.enum.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('BookingsController', () => {
  let controller: BookingsController;
  let service: BookingsService;

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
    createBooking: vi.fn(),
    findForUser: vi.fn(),
    findByIdAndValidateOwnership: vi.fn(),
    cancelBooking: vi.fn(),
    cancelPilgrim: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BookingsController>(BookingsController);
    service = module.get<BookingsService>(BookingsService);
  });

  it('createBooking should pass user ID, dto and idempotency key', async () => {
    const dto = {
      tier_id: 't-1',
      payment_mode: PaymentMode.FULL,
      pilgrims: [{ name: 'Faishal', passport_number: 'AB123' }],
    };
    mockService.createBooking.mockResolvedValue({ id: 'b-1' });

    const result = await controller.createBooking(mockUser, dto, 'key-123');

    expect(service.createBooking).toHaveBeenCalledWith(
      'user-123',
      dto,
      'key-123',
    );
    expect(result).toEqual({ id: 'b-1' });
  });

  it('cancelPilgrim should call bookingsService.cancelPilgrim', async () => {
    mockService.cancelPilgrim.mockResolvedValue({ id: 'p-1', status: 'CANCELLED' });

    const result = await controller.cancelPilgrim('b-1', 'p-1', mockUser);

    expect(service.cancelPilgrim).toHaveBeenCalledWith('b-1', 'p-1', mockUser);
    expect(result).toEqual({ id: 'p-1', status: 'CANCELLED' });
  });
});
