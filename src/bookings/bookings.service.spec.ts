import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { Booking } from './entities/booking.entity.js';
import { BookingStatus } from './enums/booking-status.enum.js';
import { PaymentMode } from './enums/payment-mode.enum.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('BookingsService', () => {
  let service: BookingsService;
  let mockBookingsRepository: any;

  const mockUserA: User = {
    id: 'user-a-id',
    name: 'User A',
    email: 'userA@example.com',
    phone: null,
    passwordHash: 'hashed',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserB: User = {
    id: 'user-b-id',
    name: 'User B',
    email: 'userB@example.com',
    phone: null,
    passwordHash: 'hashed',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmin: User = {
    id: 'admin-id',
    name: 'Admin User',
    email: 'admin@example.com',
    phone: null,
    passwordHash: 'hashed',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBookingA: Booking = {
    id: 'booking-a-id',
    userId: 'user-a-id',
    packageId: 'package-1-id',
    tierId: 'tier-1-id',
    status: BookingStatus.HELD,
    paymentMode: PaymentMode.FULL,
    tierNameSnapshot: 'Economy',
    unitPriceSnapshot: 150000,
    totalAmount: 150000,
    expiresAt: new Date(),
    version: 1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUserA,
    pilgrims: [],
    seatReservations: [],
  };

  beforeEach(async () => {
    mockBookingsRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingsRepository,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  describe('findForUser', () => {
    it('should query bookings strictly for the given user ID', async () => {
      mockBookingsRepository.find.mockResolvedValue([mockBookingA]);

      const result = await service.findForUser('user-a-id');

      expect(mockBookingsRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-a-id' },
        relations: ['pilgrims', 'seatReservations'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockBookingA]);
    });
  });

  describe('findByIdAndValidateOwnership', () => {
    it('should return booking when accessed by the owner', async () => {
      mockBookingsRepository.findOne.mockResolvedValue(mockBookingA);

      const result = await service.findByIdAndValidateOwnership(
        'booking-a-id',
        mockUserA,
      );

      expect(result).toEqual(mockBookingA);
    });

    it('should return booking when accessed by an ADMIN', async () => {
      mockBookingsRepository.findOne.mockResolvedValue(mockBookingA);

      const result = await service.findByIdAndValidateOwnership(
        'booking-a-id',
        mockAdmin,
      );

      expect(result).toEqual(mockBookingA);
    });

    it('should throw ForbiddenException when accessed by another regular user', async () => {
      mockBookingsRepository.findOne.mockResolvedValue(mockBookingA);

      await expect(
        service.findByIdAndValidateOwnership('booking-a-id', mockUserB),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      mockBookingsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByIdAndValidateOwnership('non-existent-id', mockUserA),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking if user is owner', async () => {
      mockBookingsRepository.findOne.mockResolvedValue(mockBookingA);
      mockBookingsRepository.save.mockImplementation(async (b) => b);

      const result = await service.cancelBooking(
        'booking-a-id',
        mockUserA,
        'Changed plans',
      );

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(mockBookingsRepository.save).toHaveBeenCalled();
    });

    it('should reject cancellation if user is not owner and not admin', async () => {
      mockBookingsRepository.findOne.mockResolvedValue(mockBookingA);

      await expect(
        service.cancelBooking('booking-a-id', mockUserB),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
