import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
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
    findForUser: vi.fn(),
    findByIdAndValidateOwnership: vi.fn(),
    cancelBooking: vi.fn(),
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

  it('getMyBookings should derive user ID from authenticated user', async () => {
    mockService.findForUser.mockResolvedValue([]);
    await controller.getMyBookings(mockUser);
    expect(mockService.findForUser).toHaveBeenCalledWith('user-123');
  });

  it('getBookings should derive user ID from authenticated user', async () => {
    mockService.findForUser.mockResolvedValue([]);
    await controller.getBookings(mockUser);
    expect(mockService.findForUser).toHaveBeenCalledWith('user-123');
  });

  it('getBooking should validate ownership with authenticated user', async () => {
    mockService.findByIdAndValidateOwnership.mockResolvedValue({ id: 'b-1' });
    const result = await controller.getBooking('b-1', mockUser);
    expect(mockService.findByIdAndValidateOwnership).toHaveBeenCalledWith(
      'b-1',
      mockUser,
    );
    expect(result).toEqual({ id: 'b-1' });
  });

  it('cancelBooking should pass booking ID, user and reason to service', async () => {
    mockService.cancelBooking.mockResolvedValue({ id: 'b-1', status: 'CANCELLED' });
    const result = await controller.cancelBooking('b-1', mockUser, {
      reason: 'Medical reason',
    });
    expect(mockService.cancelBooking).toHaveBeenCalledWith(
      'b-1',
      mockUser,
      'Medical reason',
    );
    expect(result).toEqual({ id: 'b-1', status: 'CANCELLED' });
  });
});
