import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentsService } from './payments.service.js';
import { Payment } from './entities/payment.entity.js';
import { Installment } from './entities/installment.entity.js';
import { PaymentAllocation } from './entities/payment-allocation.entity.js';
import {
  GatewayEventStatus,
  PaymentGatewayEvent,
} from './entities/payment-gateway-event.entity.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
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
  let mockAuditLogsRepository: any;
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

  const mockAdmin1: User = {
    id: 'admin-1-id',
    name: 'Admin One',
    email: 'admin1@example.com',
    phone: null,
    passwordHash: 'hashed',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmin2: User = {
    id: 'admin-2-id',
    name: 'Admin Two',
    email: 'admin2@example.com',
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

    mockAuditLogsRepository = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'audit-id-1', ...dto })),
      save: vi.fn().mockImplementation((log) => Promise.resolve({ id: log.id || 'audit-id-1', ...log })),
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
      releaseSeats: vi.fn().mockResolvedValue({}),
    };

    mockDataSource = {
      transaction: vi.fn().mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: vi.fn().mockImplementation((entity) => {
            if (entity === Payment) return mockPaymentsRepository;
            if (entity === Booking) return mockBookingsRepository;
            if (entity === PaymentGatewayEvent) return mockGatewayEventsRepository;
            if (entity === AuditLog) return mockAuditLogsRepository;
            return {};
          }),
          findOne: vi.fn().mockImplementation((entity, options) => {
            if (entity === Payment) return Promise.resolve(mockPaymentsRepository.findOne(options));
            if (entity === Booking) return Promise.resolve(mockBookingsRepository.findOne(options));
            if (entity === PaymentGatewayEvent) return Promise.resolve(mockGatewayEventsRepository.findOne(options));
            if (entity === AuditLog) return Promise.resolve(mockAuditLogsRepository.findOne(options));
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
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogsRepository,
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
      mockPaymentsRepository.find.mockResolvedValue([]);
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

    it('should throw BadRequestException if booking is EXPIRED or overdue', async () => {
      mockBookingsService.findByIdAndValidateOwnership.mockResolvedValue({
        ...mockBookingA,
        status: BookingStatus.EXPIRED,
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
            amount: 30000,
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

      mockGatewayEventsRepository.findOne.mockResolvedValue(null);
      mockPaymentsRepository.findOne.mockImplementation(({ where }: any) => {
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
    });

    it('should not confirm booking if webhook arrives after booking has expired, and flag for review', async () => {
      const expiredBooking: Booking = {
        ...mockBookingA,
        status: BookingStatus.EXPIRED,
      };

      const pendingPayment: Payment = {
        id: 'pay-pending-late',
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
        booking: expiredBooking,
        allocations: [],
      };

      mockGatewayEventsRepository.findOne.mockResolvedValue(null);
      mockPaymentsRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id) return Promise.resolve({ ...pendingPayment });
        return Promise.resolve(null);
      });
      mockBookingsRepository.findOne.mockResolvedValue({ ...expiredBooking });

      const result = await service.processGatewayWebhook('BKASH', {
        event_id: 'EVT-LATE-1',
        transaction_id: 'TRX_LATE_999',
        payment_id: 'pay-pending-late',
        amount: 100000,
        status: PaymentStatus.SUCCESS,
      });

      expect(result.payment?.status).toBe(PaymentStatus.SUCCESS);
      expect(result.message).toContain('recorded for review and refund handling');
      expect(mockSeatReservationService.confirmSeats).not.toHaveBeenCalled();
      expect(mockAuditLogsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PAYMENT_RECEIVED_AFTER_EXPIRATION',
        }),
      );
    });
  });

  describe('B10 — Manual Payment Approval & Maker-Checker Rule', () => {
    it('should successfully approve manual payment when recorded_by != approved_by', async () => {
      const pendingManualPayment: Payment = {
        id: 'pay-manual-1',
        bookingId: 'booking-a-id',
        provider: 'MANUAL',
        method: 'CASH',
        amount: 50000,
        currency: 'BDT',
        gatewayTransactionId: 'SLIP-100',
        status: PaymentStatus.PENDING,
        createdBy: mockAdmin1.id, // Recorded by Admin 1
        approvedBy: null,
        createdAt: new Date(),
        booking: mockBookingA,
        allocations: [],
      };

      mockPaymentsRepository.findOne.mockResolvedValue({ ...pendingManualPayment });

      // Admin 2 approves
      const result = await service.approveManualPayment(
        'pay-manual-1',
        mockAdmin2,
      );

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(result.approvedBy).toBe(mockAdmin2.id);
    });

    it('should throw ForbiddenException if creator attempts to approve their own recorded payment (Maker-Checker violation)', async () => {
      const pendingManualPayment: Payment = {
        id: 'pay-manual-1',
        bookingId: 'booking-a-id',
        provider: 'MANUAL',
        method: 'CASH',
        amount: 50000,
        currency: 'BDT',
        gatewayTransactionId: 'SLIP-100',
        status: PaymentStatus.PENDING,
        createdBy: mockAdmin1.id, // Recorded by Admin 1
        approvedBy: null,
        createdAt: new Date(),
        booking: mockBookingA,
        allocations: [],
      };

      mockPaymentsRepository.findOne.mockResolvedValue(pendingManualPayment);

      // Admin 1 attempts to approve own recorded payment
      await expect(
        service.approveManualPayment('pay-manual-1', mockAdmin1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully reject manual payment and create audit record', async () => {
      const pendingManualPayment: Payment = {
        id: 'pay-manual-2',
        bookingId: 'booking-a-id',
        provider: 'MANUAL',
        method: 'BANK_TRANSFER',
        amount: 50000,
        currency: 'BDT',
        gatewayTransactionId: 'SLIP-200',
        status: PaymentStatus.PENDING,
        createdBy: mockAdmin1.id, // Recorded by Admin 1
        approvedBy: null,
        createdAt: new Date(),
        booking: mockBookingA,
        allocations: [],
      };

      mockPaymentsRepository.findOne.mockResolvedValue({ ...pendingManualPayment });

      const result = await service.rejectManualPayment(
        'pay-manual-2',
        mockAdmin2,
        'Invalid bank deposit slip',
      );

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.approvedBy).toBe(mockAdmin2.id);
    });

    it('should throw BadRequestException if payment is not in PENDING status', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(mockPaymentA); // Status is SUCCESS

      await expect(
        service.approveManualPayment('payment-a-id', mockAdmin2),
      ).rejects.toThrow(BadRequestException);
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
        mockAdmin1,
      );

      expect(result.provider).toBe('MANUAL');
      expect(result.method).toBe('BANK_TRANSFER');
      expect(result.amount).toBe(50000);
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.createdBy).toBe(mockAdmin1.id);
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
  });
});
