import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from './reports.service.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { BookingStatus } from '../bookings/enums/booking-status.enum.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { PaymentStatus } from '../payments/enums/payment-status.enum.js';
import { Installment } from '../payments/entities/installment.entity.js';
import { InstallmentStatus } from '../payments/enums/installment-status.enum.js';
import { Refund } from '../cancellations/entities/refund.entity.js';
import { RefundStatus } from '../cancellations/enums/refund-status.enum.js';
import { PackageTier } from '../packages/entities/package-tier.entity.js';

describe('ReportsService', () => {
  let service: ReportsService;
  let bookingsRepository: any;
  let paymentsRepository: any;
  let installmentsRepository: any;
  let refundsRepository: any;
  let tiersRepository: any;

  beforeEach(async () => {
    bookingsRepository = {
      createQueryBuilder: vi.fn(),
    };
    paymentsRepository = {
      createQueryBuilder: vi.fn(),
    };
    installmentsRepository = {
      createQueryBuilder: vi.fn(),
    };
    refundsRepository = {
      createQueryBuilder: vi.fn(),
    };
    tiersRepository = {
      createQueryBuilder: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: bookingsRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: paymentsRepository,
        },
        {
          provide: getRepositoryToken(Installment),
          useValue: installmentsRepository,
        },
        {
          provide: getRepositoryToken(Refund),
          useValue: refundsRepository,
        },
        {
          provide: getRepositoryToken(PackageTier),
          useValue: tiersRepository,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBookingsSummary', () => {
    it('should aggregate booking summary correctly', async () => {
      const mockBookings = [
        {
          id: 'b1',
          status: BookingStatus.CONFIRMED,
          totalAmount: 150000,
          pilgrims: [{ id: 'p1' }, { id: 'p2' }],
        },
        {
          id: 'b2',
          status: BookingStatus.HELD,
          totalAmount: 75000,
          pilgrims: [{ id: 'p3' }],
        },
        {
          id: 'b3',
          status: BookingStatus.CANCELLED,
          totalAmount: 50000,
          pilgrims: [{ id: 'p4' }],
        },
      ];

      const queryBuilder: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockBookings),
      };
      bookingsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getBookingsSummary('pkg-1');

      expect(queryBuilder.where).toHaveBeenCalledWith('booking.packageId = :packageId', {
        packageId: 'pkg-1',
      });
      expect(result.totalBookings).toBe(3);
      expect(result.totalPilgrims).toBe(4);
      expect(result.totalBookedValue).toBe(225000); // Excludes cancelled booking
      expect(result.statusCounts[BookingStatus.CONFIRMED]).toBe(1);
      expect(result.statusCounts[BookingStatus.HELD]).toBe(1);
      expect(result.statusCounts[BookingStatus.CANCELLED]).toBe(1);
    });
  });

  describe('getCollectionsReport', () => {
    it('should calculate collection breakdown by provider and method', async () => {
      const mockPayments = [
        {
          id: 'pay-1',
          amount: 50000,
          provider: 'SSLCOMMERZ',
          method: 'CARD',
          status: PaymentStatus.SUCCESS,
        },
        {
          id: 'pay-2',
          amount: 30000,
          provider: 'BKASH',
          method: 'WALLET',
          status: PaymentStatus.SUCCESS,
        },
        {
          id: 'pay-3',
          amount: 20000,
          provider: 'MANUAL',
          method: 'BANK_TRANSFER',
          status: PaymentStatus.SUCCESS,
        },
      ];

      const queryBuilder: any = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockPayments),
      };
      paymentsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getCollectionsReport('SSLCOMMERZ');

      expect(result.totalCollected).toBe(100000);
      expect(result.gatewayCollected).toBe(80000);
      expect(result.manualCollected).toBe(20000);
      expect(result.totalTransactions).toBe(3);
      expect(result.providerBreakdown['SSLCOMMERZ']).toBe(50000);
      expect(result.providerBreakdown['BKASH']).toBe(30000);
      expect(result.providerBreakdown['MANUAL']).toBe(20000);
      expect(result.methodBreakdown['CARD']).toBe(50000);
    });
  });

  describe('getOutstandingInstallmentsReport', () => {
    it('should calculate outstanding and overdue balances', async () => {
      const mockInstallments = [
        {
          id: 'i1',
          amountDue: 50000,
          amountPaid: 0,
          status: InstallmentStatus.OVERDUE,
        },
        {
          id: 'i2',
          amountDue: 50000,
          amountPaid: 20000,
          status: InstallmentStatus.PARTIAL,
        },
        {
          id: 'i3',
          amountDue: 50000,
          amountPaid: 0,
          status: InstallmentStatus.PENDING,
        },
      ];

      const queryBuilder: any = {
        innerJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockInstallments),
      };
      installmentsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getOutstandingInstallmentsReport();

      expect(result.totalOutstanding).toBe(130000); // 50k + 30k + 50k
      expect(result.totalOverdue).toBe(50000);
      expect(result.overdueCount).toBe(1);
      expect(result.partialCount).toBe(1);
      expect(result.pendingCount).toBe(1);
      expect(result.totalUnpaidInstallments).toBe(3);
    });
  });

  describe('getRefundsReport', () => {
    it('should aggregate refunds by status and amounts', async () => {
      const mockRefunds = [
        { id: 'r1', amount: 15000, status: RefundStatus.REQUESTED },
        { id: 'r2', amount: 20000, status: RefundStatus.APPROVED },
        { id: 'r3', amount: 35000, status: RefundStatus.COMPLETED },
      ];

      const queryBuilder: any = {
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockRefunds),
      };
      refundsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getRefundsReport();

      expect(result.totalRefundCount).toBe(3);
      expect(result.totalRequestedAmount).toBe(15000);
      expect(result.totalApprovedAmount).toBe(20000);
      expect(result.totalCompletedAmount).toBe(35000);
      expect(result.statusCounts[RefundStatus.REQUESTED]).toBe(1);
      expect(result.statusCounts[RefundStatus.APPROVED]).toBe(1);
      expect(result.statusCounts[RefundStatus.COMPLETED]).toBe(1);
    });
  });

  describe('getSeatsReport', () => {
    it('should calculate seat occupancy metrics', async () => {
      const mockTiers = [
        {
          id: 'tier-1',
          name: 'VIP Gold',
          quota: 50,
          heldSeats: 10,
          confirmedSeats: 30,
          package: { name: 'Premium Hajj 2026' },
        },
        {
          id: 'tier-2',
          name: 'Economy',
          quota: 50,
          heldSeats: 0,
          confirmedSeats: 10,
          package: { name: 'Premium Hajj 2026' },
        },
      ];

      const queryBuilder: any = {
        innerJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockTiers),
      };
      tiersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getSeatsReport('pkg-1');

      expect(result.totalSystemQuota).toBe(100);
      expect(result.totalHeldSeats).toBe(10);
      expect(result.totalConfirmedSeats).toBe(40);
      expect(result.totalAvailable).toBe(50);
      expect(result.systemOccupancyRate).toBe(50);
      expect(result.tierBreakdown).toHaveLength(2);
      expect(result.tierBreakdown[0].occupancyRate).toBe(80);
      expect(result.tierBreakdown[0].availableSeats).toBe(10);
      expect(result.tierBreakdown[1].occupancyRate).toBe(20);
      expect(result.tierBreakdown[1].availableSeats).toBe(40);
    });
  });
});
