import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentsService } from './payments.service.js';
import { Payment } from './entities/payment.entity.js';
import { Installment } from './entities/installment.entity.js';
import { PaymentAllocation } from './entities/payment-allocation.entity.js';
import {
  GatewayEventStatus,
  PaymentGatewayEvent,
} from './entities/payment-gateway-event.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { InstallmentsService } from '../installments/installments.service.js';
import { SeatReservationService } from '../seat-reservation/seat-reservation.service.js';
import { PaymentStatus } from './enums/payment-status.enum.js';
import { PaymentMode } from '../bookings/enums/payment-mode.enum.js';
import { BookingStatus } from '../bookings/enums/booking-status.enum.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPaymentsRepository: any;
  let mockGatewayEventsRepository: any;
  let mockBookingsRepository: any;
  let mockBookingsService: any;
  let mockInstallmentsService: any;
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

  const mockBookingA: Booking = {
    id: 'booking-a-id',
    userId: 'user-a-id',
    packageId: 'pkg-id',
    tierId: 'tier-id',
    status: BookingStatus.HELD,
    paymentMode: PaymentMode.FULL,
    tierNameSnapshot: 'VIP Tier',
    unitPriceSnapshot: 100000,
    totalAmount: 100000,
    expiresAt: new Date(Date.now() + 900000),
    version: 1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUserA,
    pilgrims: [],
    seatReservations: [],
  };

  const mockPaymentA: Payment = {
    id: 'payment-a-id',
    bookingId: 'booking-a-id',
    provider: 'BKASH',
    method: 'WALLET',
    amount: 100000,
    currency: 'BDT',
    gatewayTransactionId: 'TRX123',
    status: PaymentStatus.SUCCESS,
    createdBy: 'user-a-id',
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
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      create: vi.fn().mockImplementation((dto) => ({ id: 'new-payment-id', ...dto })),
      save: vi.fn().mockImplementation((payment) => Promise.resolve({ id: payment.id || 'new-payment-id', ...payment })),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    mockGatewayEventsRepository = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((dto) => ({ id: 'event-id-1', ...dto })),
      save: vi.fn().mockImplementation((evt) => Promise.resolve({ id: evt.id || 'event-id-1', ...evt })),
    };

    mockBookingsRepository = {
      findOne: vi.fn().mockResolvedValue(mockBookingA),
      save: vi.fn().mockImplementation((b) => Promise.resolve(b)),
    };

    mockBookingsService = {
      findByIdAndValidateOwnership: vi.fn().mockResolvedValue(mockBookingA),
    };

    mockInstallmentsService = {
      allocatePayment: vi.fn().mockResolvedValue({
        allocations: [],
        unallocatedAmount: 0,
        allPaid: true,
      }),
    };

    mockSeatReservationService = {
      confirmSeats: vi.fn().mockResolvedValue({}),
    };

    mockDataSource = {
      transaction: vi.fn().mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: vi.fn().mockImplementation((entity) => {
            if (entity === Payment) return mockPaymentsRepository;
            if (entity === Booking) return mockBookingsRepository;
            if (entity === PaymentGatewayEvent) return mockGatewayEventsRepository;
            return {};
          }),
          findOne: vi.fn().mockImplementation((entity, options) => {
            if (entity === Payment) return Promise.resolve(mockPaymentsRepository.findOne(options));
            if (entity === Booking) return Promise.resolve(mockBookingsRepository.findOne(options));
            if (entity === PaymentGatewayEvent) return Promise.resolve(mockGatewayEventsRepository.findOne(options));
            return Promise.resolve(null);
          }),
          save: vi.fn().mockImplementation((entity, obj) => Promise.resolve(obj)),
          create: vi.fn().mockImplementation((entity, obj) => obj),
        };
        return cb(mockManager);
      }),
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
          provide: getRepositoryToken(PaymentGatewayEvent),
          useValue: mockGatewayEventsRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingsRepository,
        },
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
        {
          provide: InstallmentsService,
          useValue: mockInstallmentsService,
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

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('initiateGatewayPayment', () => {
    it('should successfully initiate a payment session for valid booking', async () => {
      mockPaymentsRepository.find.mockResolvedValue([]); // No prior payments
      const result = await service.initiateGatewayPayment(
        {
          booking_id: 'booking-a-id',
          amount: 100000,
          provider: 'BKASH',
        },
        mockUserA,
      );

      expect(result.payment.status).toBe(PaymentStatus.PENDING);
      expect(result.payment.amount).toBe(100000);
      expect(result.payment.provider).toBe('BKASH');
      expect(result.checkoutUrl).toContain('bkash');
    });

    it('should throw BadRequestException if booking is CANCELLED', async () => {
      mockBookingsService.findByIdAndValidateOwnership.mockResolvedValue({
        ...mockBookingA,
        status: BookingStatus.CANCELLED,
      });

      await expect(
        service.initiateGatewayPayment(
          {
            booking_id: 'booking-a-id',
            amount: 50000,
            provider: 'BKASH',
          },
          mockUserA,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if payment amount exceeds remaining balance', async () => {
      mockPaymentsRepository.find.mockResolvedValue([
        { amount: 80000, status: PaymentStatus.SUCCESS },
      ]);

      await expect(
        service.initiateGatewayPayment(
          {
            booking_id: 'booking-a-id',
            amount: 30000, // Remaining is 20000
            provider: 'BKASH',
          },
          mockUserA,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processGatewayWebhook (B09 Idempotency & Validation)', () => {
    it('should process successful gateway webhook and record event', async () => {
      const pendingPayment: Payment = {
        id: 'pay-pending-1',
        bookingId: 'booking-a-id',
        provider: 'BKASH',
        method: 'WALLET',
        amount: 100000,
        currency: 'BDT',
        gatewayTransactionId: null,
        status: PaymentStatus.PENDING,
        createdBy: 'user-a-id',
        approvedBy: null,
        createdAt: new Date(),
        booking: mockBookingA,
        allocations: [],
      };

      mockGatewayEventsRepository.findOne.mockResolvedValue(null); // No previous event
      mockPaymentsRepository.findOne.mockImplementation(({ where }) => {
        if (where.id) return Promise.resolve({ ...pendingPayment });
        return Promise.resolve(null);
      });

      const result = await service.processGatewayWebhook('BKASH', {
        event_id: 'EVT-1001',
        transaction_id: 'TRX_NEW_999',
        payment_id: 'pay-pending-1',
        amount: 100000,
        status: PaymentStatus.SUCCESS,
      });

      expect(result.duplicate).toBe(false);
      expect(result.payment?.status).toBe(PaymentStatus.SUCCESS);
      expect(result.payment?.gatewayTransactionId).toBe('TRX_NEW_999');
      expect(mockSeatReservationService.confirmSeats).toHaveBeenCalledWith(
        'booking-a-id',
        expect.anything(),
      );
    });

    it('should handle duplicate webhook idempotently when event is already PROCESSED', async () => {
      mockGatewayEventsRepository.findOne.mockResolvedValue({
        id: 'evt-existing',
        provider: 'BKASH',
        eventId: 'EVT-DUP-1',
        status: GatewayEventStatus.PROCESSED,
      });
      mockPaymentsRepository.findOne.mockResolvedValue(mockPaymentA);

      const result = await service.processGatewayWebhook('BKASH', {
        event_id: 'EVT-DUP-1',
        transaction_id: 'TRX_DUP',
        payment_id: 'payment-a-id',
        amount: 100000,
        status: PaymentStatus.SUCCESS,
      });

      expect(result.duplicate).toBe(true);
      expect(result.message).toContain('already processed successfully');
    });

    it('should reject out-of-order webhook trying to change SUCCESS to PENDING or FAILED', async () => {
      mockGatewayEventsRepository.findOne.mockResolvedValue(null);
      mockPaymentsRepository.findOne.mockResolvedValue({
        ...mockPaymentA,
        status: PaymentStatus.SUCCESS,
      });

      await expect(
        service.processGatewayWebhook('BKASH', {
          event_id: 'EVT-OUT-OF-ORDER',
          transaction_id: 'TRX_LATE',
          payment_id: 'payment-a-id',
          amount: 100000,
          status: PaymentStatus.PENDING,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockGatewayEventsRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if payment record does not exist', async () => {
      mockGatewayEventsRepository.findOne.mockResolvedValue(null);
      mockPaymentsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.processGatewayWebhook('BKASH', {
          transaction_id: 'TRX_XYZ',
          payment_id: 'unknown-id',
          amount: 100000,
          status: PaymentStatus.SUCCESS,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordManualPayment', () => {
    it('should record manual payment request in PENDING state', async () => {
      const result = await service.recordManualPayment(
        {
          booking_id: 'booking-a-id',
          amount: 50000,
          method: 'BANK_TRANSFER',
          reference_number: 'SLIP-98765',
        },
        mockAdmin,
      );

      expect(result.provider).toBe('MANUAL');
      expect(result.method).toBe('BANK_TRANSFER');
      expect(result.amount).toBe(50000);
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.createdBy).toBe(mockAdmin.id);
    });

    it('should throw BadRequestException if manual payment exceeds balance', async () => {
      mockPaymentsRepository.find.mockResolvedValue([
        { amount: 90000, status: PaymentStatus.SUCCESS },
      ]);

      await expect(
        service.recordManualPayment(
          {
            booking_id: 'booking-a-id',
            amount: 20000, // Remaining is 10000
            method: 'CASH',
          },
          mockAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });
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
