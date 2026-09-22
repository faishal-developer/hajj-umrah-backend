import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { Payment } from './entities/payment.entity.js';
import { Installment } from './entities/installment.entity.js';
import { PaymentAllocation } from './entities/payment-allocation.entity.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { PaymentStatus } from './enums/payment-status.enum.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { Booking } from '../bookings/entities/booking.entity.js';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPaymentsRepository: any;
  let mockBookingsService: any;

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

  const mockBookingA = {
    id: 'booking-a-id',
    userId: 'user-a-id',
  } as Booking;

  const mockPaymentA: Payment = {
    id: 'payment-a-id',
    bookingId: 'booking-a-id',
    provider: 'BKASH',
    method: 'WALLET',
    amount: 50000,
    currency: 'BDT',
    gatewayTransactionId: 'TRX123',
    status: PaymentStatus.SUCCESS,
    createdBy: null,
    approvedBy: null,
    createdAt: new Date(),
    booking: mockBookingA,
    allocations: [],
  };

  beforeEach(async () => {
    const mockQueryBuilder = {
      innerJoinAndSelect: vi.fn().mockReturnThis(),
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockPaymentA]),
    };

    mockPaymentsRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    mockBookingsService = {
      findByIdAndValidateOwnership: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentsRepository,
        },
        {
          provide: getRepositoryToken(Installment),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PaymentAllocation),
          useValue: {},
        },
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('findForUser', () => {
    it('should query payments for bookings owned by the user', async () => {
      const result = await service.findForUser('user-a-id');
      expect(result).toEqual([mockPaymentA]);
    });
  });

  describe('findByBookingAndValidateOwnership', () => {
    it('should return payments if current user owns the booking', async () => {
      mockBookingsService.findByIdAndValidateOwnership.mockResolvedValue(mockBookingA);
      mockPaymentsRepository.find.mockResolvedValue([mockPaymentA]);

      const result = await service.findByBookingAndValidateOwnership(
        'booking-a-id',
        mockUserA,
      );

      expect(mockBookingsService.findByIdAndValidateOwnership).toHaveBeenCalledWith(
        'booking-a-id',
        mockUserA,
      );
      expect(result).toEqual([mockPaymentA]);
    });

    it('should propagate ForbiddenException if booking does not belong to user', async () => {
      mockBookingsService.findByIdAndValidateOwnership.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        service.findByBookingAndValidateOwnership('booking-a-id', mockUserB),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByIdAndValidateOwnership', () => {
    it('should return payment when accessed by the owner', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(mockPaymentA);

      const result = await service.findByIdAndValidateOwnership(
        'payment-a-id',
        mockUserA,
      );

      expect(result).toEqual(mockPaymentA);
    });

    it('should return payment when accessed by an ADMIN', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(mockPaymentA);

      const result = await service.findByIdAndValidateOwnership(
        'payment-a-id',
        mockAdmin,
      );

      expect(result).toEqual(mockPaymentA);
    });

    it('should throw ForbiddenException when accessed by another user', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(mockPaymentA);

      await expect(
        service.findByIdAndValidateOwnership('payment-a-id', mockUserB),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when payment does not exist', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByIdAndValidateOwnership('non-existent-id', mockUserA),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
