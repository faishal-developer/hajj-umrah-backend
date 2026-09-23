import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CancellationsService } from './cancellations.service.js';
import { Cancellation } from './entities/cancellation.entity.js';
import { CancellationPilgrim } from './entities/cancellation-pilgrim.entity.js';
import { Refund } from './entities/refund.entity.js';
import { RefundStatus } from './enums/refund-status.enum.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { PaymentStatus } from '../payments/enums/payment-status.enum.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { BookingStatus } from '../bookings/enums/booking-status.enum.js';
import { BookingPilgrim } from '../bookings/entities/booking-pilgrim.entity.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { SeatReservationService } from '../seat-reservation/seat-reservation.service.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('CancellationsService', () => {
  let service: CancellationsService;
  let mockCancellationsRepository: any;
  let mockCancellationPilgrimsRepository: any;
  let mockRefundsRepository: any;
  let mockPaymentsRepository: any;
  let mockBookingsRepository: any;
  let mockBookingPilgrimsRepository: any;
  let mockAuditLogsRepository: any;
  let mockBookingsService: any;
  let mockSeatReservationService: any;
  let mockDataSource: any;

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

  const mockPilgrim1: BookingPilgrim = {
    id: 'pilgrim-1-id',
    bookingId: 'booking-a-id',
    fullName: 'Pilgrim 1',
    passportNumber: 'A12345678',
    nationality: 'BD',
    dateOfBirth: '1985-05-15',
    passportExpiry: '2030-05-15',
    status: 'ACTIVE',
    booking: null as any,
  };

  const mockPilgrim2: BookingPilgrim = {
    id: 'pilgrim-2-id',
    bookingId: 'booking-a-id',
    fullName: 'Pilgrim 2',
    passportNumber: 'B87654321',
    nationality: 'BD',
    dateOfBirth: '1990-08-20',
    passportExpiry: '2030-08-20',
    status: 'ACTIVE',
    booking: null as any,
  };

  const mockBookingA: Booking = {
    id: 'booking-a-id',
    userId: 'user-a-id',
    packageId: 'pkg-id',
    tierId: 'tier-id',
    status: BookingStatus.CONFIRMED,
    paymentMode: null as any,
    tierNameSnapshot: 'VIP',
    unitPriceSnapshot: 50000,
    totalAmount: 100000,
    expiresAt: null,
    version: 1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUserA,
    pilgrims: [mockPilgrim1, mockPilgrim2],
    seatReservations: [],
  };

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
      find: vi.fn().mockResolvedValue([mockCancellationA]),
      findOne: vi.fn().mockResolvedValue(mockCancellationA),
      create: vi.fn().mockImplementation((dto) => ({ id: 'new-cancel-id', ...dto })),
      save: vi.fn().mockImplementation((c) => Promise.resolve({ id: c.id || 'new-cancel-id', ...c })),
      createQueryBuilder: vi.fn().mockReturnValue(mockCancellationQueryBuilder),
    };

    mockCancellationPilgrimsRepository = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'new-cp-id', ...dto })),
      save: vi.fn().mockImplementation((cp) => Promise.resolve({ id: cp.id || 'new-cp-id', ...cp })),
    };

    mockRefundsRepository = {
      find: vi.fn().mockResolvedValue([mockRefundA]),
      findOne: vi.fn().mockResolvedValue(mockRefundA),
      create: vi.fn().mockImplementation((dto) => ({ id: 'new-refund-id', ...dto })),
      save: vi.fn().mockImplementation((r) => Promise.resolve({ id: r.id || 'new-refund-id', ...r })),
      createQueryBuilder: vi.fn().mockReturnValue(mockRefundQueryBuilder),
    };

    mockPaymentsRepository = {
      find: vi.fn().mockResolvedValue([
        { id: 'pay-1', amount: 100000, status: PaymentStatus.SUCCESS },
      ]),
    };

    mockBookingsRepository = {
      findOne: vi.fn().mockResolvedValue(mockBookingA),
      save: vi.fn().mockImplementation((b) => Promise.resolve(b)),
    };

    mockBookingPilgrimsRepository = {
      save: vi.fn().mockImplementation((p) => Promise.resolve(p)),
    };

    mockAuditLogsRepository = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'audit-1', ...dto })),
      save: vi.fn().mockImplementation((a) => Promise.resolve({ id: a.id || 'audit-1', ...a })),
    };

    mockBookingsService = {
      findByIdAndValidateOwnership: vi.fn().mockResolvedValue(mockBookingA),
    };

    mockSeatReservationService = {
      releaseSeats: vi.fn().mockResolvedValue({}),
    };

    mockDataSource = {
      transaction: vi.fn().mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: vi.fn().mockImplementation((entity) => {
            if (entity === Cancellation) return mockCancellationsRepository;
            if (entity === CancellationPilgrim) return mockCancellationPilgrimsRepository;
            if (entity === Refund) return mockRefundsRepository;
            if (entity === Booking) return mockBookingsRepository;
            if (entity === AuditLog) return mockAuditLogsRepository;
            return {};
          }),
          findOne: vi.fn().mockImplementation((entity, options) => {
            if (entity === Cancellation) return Promise.resolve(mockCancellationsRepository.findOne(options));
            if (entity === Refund) return Promise.resolve(mockRefundsRepository.findOne(options));
            if (entity === Booking) return Promise.resolve(mockBookingsRepository.findOne(options));
            return Promise.resolve(null);
          }),
          save: vi.fn().mockImplementation((entity, obj) => {
            if (obj) return Promise.resolve(obj);
            return Promise.resolve(entity);
          }),
          create: vi.fn().mockImplementation((entity, obj) => obj),
        };
        return cb(mockManager);
      }),
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
          useValue: mockCancellationPilgrimsRepository,
        },
        {
          provide: getRepositoryToken(Refund),
          useValue: mockRefundsRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentsRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingsRepository,
        },
        {
          provide: getRepositoryToken(BookingPilgrim),
          useValue: mockBookingPilgrimsRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogsRepository,
        },
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
        {
          provide: SeatReservationService,
          useValue: mockSeatReservationService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CancellationsService>(CancellationsService);
  });

  describe('requestCancellation', () => {
    it('should calculate refund under refund <= received_payment constraint for full cancellation', async () => {
      mockPaymentsRepository.find.mockResolvedValue([
        { amount: 100000, status: PaymentStatus.SUCCESS },
      ]);

      const result = await service.requestCancellation(
        {
          booking_id: 'booking-a-id',
          cancellation_fee: 10000,
          reason: 'Personal reason',
        },
        mockUserA,
      );

      expect(result.totalPaid).toBe(100000);
      expect(result.refundableAmount).toBe(90000); // 100000 - 10000
      expect(result.refundableAmount).toBeLessThanOrEqual(result.totalPaid);
      expect(result.cancellation.status).toBe('REQUESTED');
      expect(result.refund.status).toBe(RefundStatus.REQUESTED);
    });

    it('should return refund = 0 when zero payments were received', async () => {
      mockPaymentsRepository.find.mockResolvedValue([]); // 0 payments received

      const result = await service.requestCancellation(
        {
          booking_id: 'booking-a-id',
          cancellation_fee: 5000,
        },
        mockUserA,
      );

      expect(result.totalPaid).toBe(0);
      expect(result.refundableAmount).toBe(0); // Cannot exceed received payment
      expect(result.refundableAmount).toBeLessThanOrEqual(result.totalPaid);
    });

    it('should calculate proportional refund for partial individual pilgrim cancellation', async () => {
      mockPaymentsRepository.find.mockResolvedValue([
        { amount: 100000, status: PaymentStatus.SUCCESS },
      ]);

      const result = await service.requestCancellation(
        {
          booking_id: 'booking-a-id',
          pilgrim_ids: ['pilgrim-1-id'], // 1 of 2 pilgrims
          cancellation_fee: 5000,
        },
        mockUserA,
      );

      expect(result.totalPaid).toBe(100000);
      // 1/2 of 100,000 = 50,000 max eligible - 5,000 fee = 45,000
      expect(result.refundableAmount).toBe(45000);
    });

    it('should throw BadRequestException if booking is already CANCELLED', async () => {
      mockBookingsService.findByIdAndValidateOwnership.mockResolvedValue({
        ...mockBookingA,
        status: BookingStatus.CANCELLED,
      });

      await expect(
        service.requestCancellation(
          { booking_id: 'booking-a-id' },
          mockUserA,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveCancellation', () => {
    it('should approve cancellation, approve refund, release seats, and audit', async () => {
      mockCancellationsRepository.findOne.mockResolvedValue({
        id: 'cancellation-a-id',
        bookingId: 'booking-a-id',
        status: 'REQUESTED',
        pilgrims: [],
      });

      mockRefundsRepository.findOne.mockResolvedValue({
        id: 'refund-a-id',
        bookingId: 'booking-a-id',
        status: RefundStatus.REQUESTED,
      });

      const result = await service.approveCancellation('cancellation-a-id', mockAdmin);

      expect(result.cancellation.status).toBe('APPROVED');
      expect(mockSeatReservationService.releaseSeats).toHaveBeenCalledWith(
        'booking-a-id',
        expect.anything(),
      );
    });

    it('should throw BadRequestException if cancellation is not in REQUESTED status', async () => {
      mockCancellationsRepository.findOne.mockResolvedValue({
        id: 'cancellation-a-id',
        status: 'APPROVED',
      });

      await expect(
        service.approveCancellation('cancellation-a-id', mockAdmin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectCancellation', () => {
    it('should reject cancellation and associated refund', async () => {
      mockCancellationsRepository.findOne.mockResolvedValue({
        id: 'cancellation-a-id',
        bookingId: 'booking-a-id',
        status: 'REQUESTED',
      });

      mockRefundsRepository.findOne.mockResolvedValue({
        id: 'refund-a-id',
        bookingId: 'booking-a-id',
        status: RefundStatus.REQUESTED,
      });

      const result = await service.rejectCancellation(
        'cancellation-a-id',
        mockAdmin,
        'Invalid document',
      );

      expect(result.cancellation.status).toBe('REJECTED');
    });
  });

  describe('processRefund', () => {
    it('should transition refund status through PROCESSING and COMPLETED', async () => {
      mockRefundsRepository.findOne.mockResolvedValue({
        id: 'refund-a-id',
        status: RefundStatus.APPROVED,
      });

      const result = await service.processRefund(
        'refund-a-id',
        {
          status: RefundStatus.COMPLETED,
          transaction_reference: 'GATEWAY-REFUND-999',
        },
        mockAdmin,
      );

      expect(result.status).toBe(RefundStatus.COMPLETED);
      expect(result.approvedBy).toBe(mockAdmin.id);
    });

    it('should throw BadRequestException when updating already COMPLETED refund', async () => {
      mockRefundsRepository.findOne.mockResolvedValue({
        id: 'refund-a-id',
        status: RefundStatus.COMPLETED,
      });

      await expect(
        service.processRefund(
          'refund-a-id',
          { status: RefundStatus.PROCESSING },
          mockAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });
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
    it('should return cancellation when accessed by the owner', async () => {
      mockCancellationsRepository.findOne.mockResolvedValue(mockCancellationA);

      const result = await service.findByIdAndValidateOwnership(
        'cancellation-a-id',
        mockUserA,
      );

      expect(result).toEqual(mockCancellationA);
    });

    it('should return cancellation when accessed by an ADMIN', async () => {
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

    it('should throw NotFoundException when cancellation does not exist', async () => {
      mockCancellationsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByIdAndValidateOwnership('non-existent-id', mockUserA),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findRefundsForUser', () => {
    it('should query refunds for bookings owned by the user', async () => {
      const result = await service.findRefundsForUser('user-a-id');
      expect(result).toEqual([mockRefundA]);
    });
  });

  describe('findRefundByIdAndValidateOwnership', () => {
    it('should return refund when accessed by the owner', async () => {
      mockRefundsRepository.findOne.mockResolvedValue(mockRefundA);

      const result = await service.findRefundByIdAndValidateOwnership(
        'refund-a-id',
        mockUserA,
      );

      expect(result).toEqual(mockRefundA);
    });

    it('should return refund when accessed by an ADMIN', async () => {
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

    it('should throw NotFoundException when refund does not exist', async () => {
      mockRefundsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findRefundByIdAndValidateOwnership('non-existent-id', mockUserA),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
