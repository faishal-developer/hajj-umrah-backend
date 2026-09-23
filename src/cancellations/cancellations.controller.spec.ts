import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CancellationsController } from './cancellations.controller.js';
import { CancellationsService } from './cancellations.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('CancellationsController', () => {
  let controller: CancellationsController;

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

  const mockAdmin: User = {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    phone: null,
    passwordHash: 'hashed',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    requestCancellation: vi.fn(),
    approveCancellation: vi.fn(),
    rejectCancellation: vi.fn(),
    findForUser: vi.fn(),
    findByBookingAndValidateOwnership: vi.fn(),
    findByIdAndValidateOwnership: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CancellationsController],
      providers: [
        {
          provide: CancellationsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CancellationsController>(CancellationsController);
  });

  it('requestCancellation should invoke service.requestCancellation', async () => {
    const dto = { booking_id: 'b-1', reason: 'Personal' };
    mockService.requestCancellation.mockResolvedValue({ id: 'c-1' });

    const result = await controller.requestCancellation(dto, mockUser);
    expect(mockService.requestCancellation).toHaveBeenCalledWith(dto, mockUser);
    expect(result).toEqual({ id: 'c-1' });
  });

  it('approveCancellation should invoke service.approveCancellation', async () => {
    mockService.approveCancellation.mockResolvedValue({ message: 'Approved' });

    const result = await controller.approveCancellation('c-1', mockAdmin);
    expect(mockService.approveCancellation).toHaveBeenCalledWith('c-1', mockAdmin);
    expect(result).toEqual({ message: 'Approved' });
  });

  it('rejectCancellation should invoke service.rejectCancellation', async () => {
    mockService.rejectCancellation.mockResolvedValue({ message: 'Rejected' });

    const result = await controller.rejectCancellation('c-1', 'Invalid', mockAdmin);
    expect(mockService.rejectCancellation).toHaveBeenCalledWith('c-1', mockAdmin, 'Invalid');
    expect(result).toEqual({ message: 'Rejected' });
  });

  it('getMyCancellations should derive user ID from authenticated user', async () => {
    mockService.findForUser.mockResolvedValue([]);
    await controller.getMyCancellations(mockUser);
    expect(mockService.findForUser).toHaveBeenCalledWith('user-123');
  });

  it('getCancellationsByBooking should validate booking ownership', async () => {
    mockService.findByBookingAndValidateOwnership.mockResolvedValue([]);
    await controller.getCancellationsByBooking('booking-123', mockUser);
    expect(mockService.findByBookingAndValidateOwnership).toHaveBeenCalledWith(
      'booking-123',
      mockUser,
    );
  });

  it('getCancellation should validate cancellation ownership', async () => {
    mockService.findByIdAndValidateOwnership.mockResolvedValue({ id: 'c-1' });
    const result = await controller.getCancellation('c-1', mockUser);
    expect(mockService.findByIdAndValidateOwnership).toHaveBeenCalledWith(
      'c-1',
      mockUser,
    );
    expect(result).toEqual({ id: 'c-1' });
  });
});
