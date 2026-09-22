import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CancellationsService } from './cancellations.service.js';
import { Cancellation } from './entities/cancellation.entity.js';
import { CancellationPilgrim } from './entities/cancellation-pilgrim.entity.js';
import { Refund } from './entities/refund.entity.js';
import { RefundStatus } from './enums/refund-status.enum.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { Booking } from '../bookings/entities/booking.entity.js';

describe('CancellationsService', () => {
  let service: CancellationsService;
  let mockCancellationsRepository: any;
  let mockRefundsRepository: any;
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

  const mockCancellationA: Cancellation = {
    id: 'cancellation-a-id',
    bookingId: 'booking-a-id',
    reason: 'Health issues',
    cancellationFee: 5000,
    status: 'REQUESTED',
    createdAt: new Date(),
    booking: mockBookingA,
    pilgrims: [],
  };

  const mockRefundA: Refund = {
    id: 'refund-a-id',
    bookingId: 'booking-a-id',
    amount: 45000,
    status: RefundStatus.REQUESTED,
    approvedBy: null,
    createdAt: new Date(),
    booking: mockBookingA,
  };

  beforeEach(async () => {
    const mockCancellationQueryBuilder = {
      innerJoinAndSelect: vi.fn().mockReturnThis(),
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockCancellationA]),
    };

    const mockRefundQueryBuilder = {
      innerJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockRefundA]),
    };

    mockCancellationsRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue(mockCancellationQueryBuilder),
    };

    mockRefundsRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue(mockRefundQueryBuilder),
    };

    mockBookingsService = {
      findByIdAndValidateOwnership: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancellationsService,
        {
          provide: getRepositoryToken(Cancellation),
          useValue: mockCancellationsRepository,
        },
        {
          provide: getRepositoryToken(CancellationPilgrim),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Refund),
          useValue: mockRefundsRepository,
        },
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
      ],
    }).compile();

    service = module.get<CancellationsService>(CancellationsService);
  });

  describe('findForUser', () => {
    it('should query cancellations for bookings owned by the user', async () => {
      const result = await service.findForUser('user-a-id');
      expect(result).toEqual([mockCancellationA]);
    });
  });

  describe('findByBookingAndValidateOwnership', () => {
    it('should return cancellations if current user owns the booking', async () => {
      mockBookingsService.findByIdAndValidateOwnership.mockResolvedValue(mockBookingA);
      mockCancellationsRepository.find.mockResolvedValue([mockCancellationA]);

      const result = await service.findByBookingAndValidateOwnership(
        'booking-a-id',
        mockUserA,
      );

      expect(mockBookingsService.findByIdAndValidateOwnership).toHaveBeenCalledWith(
        'booking-a-id',
        mockUserA,
      );
      expect(result).toEqual([mockCancellationA]);
    });

    it('should throw ForbiddenException if user does not own booking', async () => {
      mockBookingsService.findByIdAndValidateOwnership.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        service.findByBookingAndValidateOwnership('booking-a-id', mockUserB),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByIdAndValidateOwnership', () => {
    it('should return cancellation when accessed by owner', async () => {
      mockCancellationsRepository.findOne.mockResolvedValue(mockCancellationA);

      const result = await service.findByIdAndValidateOwnership(
        'cancellation-a-id',
        mockUserA,
      );

      expect(result).toEqual(mockCancellationA);
    });

    it('should return cancellation when accessed by ADMIN', async () => {
      mockCancellationsRepository.findOne.mockResolvedValue(mockCancellationA);

      const result = await service.findByIdAndValidateOwnership(
        'cancellation-a-id',
        mockAdmin,
      );

      expect(result).toEqual(mockCancellationA);
    });

    it('should throw ForbiddenException when accessed by another user', async () => {
      mockCancellationsRepository.findOne.mockResolvedValue(mockCancellationA);

      await expect(
        service.findByIdAndValidateOwnership('cancellation-a-id', mockUserB),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findRefundByIdAndValidateOwnership', () => {
    it('should return refund when accessed by owner', async () => {
      mockRefundsRepository.findOne.mockResolvedValue(mockRefundA);

      const result = await service.findRefundByIdAndValidateOwnership(
        'refund-a-id',
        mockUserA,
      );

      expect(result).toEqual(mockRefundA);
    });

    it('should return refund when accessed by ADMIN', async () => {
      mockRefundsRepository.findOne.mockResolvedValue(mockRefundA);

      const result = await service.findRefundByIdAndValidateOwnership(
        'refund-a-id',
        mockAdmin,
      );

      expect(result).toEqual(mockRefundA);
    });

    it('should throw ForbiddenException when accessed by another user', async () => {
      mockRefundsRepository.findOne.mockResolvedValue(mockRefundA);

      await expect(
        service.findRefundByIdAndValidateOwnership('refund-a-id', mockUserB),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
