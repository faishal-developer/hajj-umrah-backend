import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InstallmentsService } from './installments.service.js';
import { Installment } from '../payments/entities/installment.entity.js';
import { InstallmentStatus } from '../payments/enums/installment-status.enum.js';
import { PaymentAllocation } from '../payments/entities/payment-allocation.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { BookingStatus } from '../bookings/enums/booking-status.enum.js';

describe('InstallmentsService (B07 — Installment Schedule & Oldest-First Allocation)', () => {
  let service: InstallmentsService;
  let mockInstallmentsRepository: any;
  let mockAllocationsRepository: any;
  let mockBookingsRepository: any;

  beforeEach(async () => {
    mockInstallmentsRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn().mockImplementation((dto) => ({ ...dto, id: 'inst-id' })),
      save: vi.fn().mockImplementation(async (insts) => insts),
      createQueryBuilder: vi.fn(),
    };

    mockAllocationsRepository = {
      create: vi.fn().mockImplementation((dto) => ({ ...dto, id: 'alloc-id' })),
      save: vi.fn().mockImplementation(async (alloc) => alloc),
    };

    mockBookingsRepository = {
      findOne: vi.fn(),
      save: vi.fn().mockImplementation(async (b) => b),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstallmentsService,
        {
          provide: getRepositoryToken(Installment),
          useValue: mockInstallmentsRepository,
        },
        {
          provide: getRepositoryToken(PaymentAllocation),
          useValue: mockAllocationsRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingsRepository,
        },
      ],
    }).compile();

    service = module.get<InstallmentsService>(InstallmentsService);
  });

  describe('generateSchedule', () => {
    it('should generate balanced installments equaling exact totalAmount', async () => {
      const result = await service.generateSchedule(
        'booking-uuid',
        100000, // 100,000 / 3 = 33,334 + 33,333 + 33,333
        '2027-03-15',
        3,
      );

      expect(result.length).toBe(3);
      expect(result[0].sequence).toBe(1);
      expect(result[0].amountDue).toBe(33334);
      expect(result[0].amountPaid).toBe(0);
      expect(result[0].status).toBe(InstallmentStatus.PENDING);

      expect(result[1].sequence).toBe(2);
      expect(result[1].amountDue).toBe(33333);

      expect(result[2].sequence).toBe(3);
      expect(result[2].amountDue).toBe(33333);

      const sum = result.reduce((acc, i) => acc + i.amountDue, 0);
      expect(sum).toBe(100000);
    });
  });

  describe('allocatePayment (Oldest Unpaid First Rule)', () => {
    it('should allocate payment to oldest unpaid installment first (50k -> Inst 1, 30k -> Inst 2)', async () => {
      const inst1: Installment = {
        id: 'inst-1',
        bookingId: 'booking-1',
        sequence: 1,
        amountDue: 100000,
        amountPaid: 50000, // 50,000 remaining
        dueDate: '2026-11-01',
        graceEndDate: '2026-11-10',
        status: InstallmentStatus.PARTIAL,
        booking: null as any,
      };

      const inst2: Installment = {
        id: 'inst-2',
        bookingId: 'booking-1',
        sequence: 2,
        amountDue: 100000,
        amountPaid: 0, // 100,000 remaining
        dueDate: '2026-12-01',
        graceEndDate: '2026-12-10',
        status: InstallmentStatus.PENDING,
        booking: null as any,
      };

      mockInstallmentsRepository.find.mockResolvedValue([inst1, inst2]);
      mockBookingsRepository.findOne.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.HELD,
      });

      // Receiving 80,000 BDT payment
      const result = await service.allocatePayment('booking-1', 'pay-1', 80000);

      // Inst 1 should receive 50,000 and become PAID (amountPaid = 100,000)
      expect(inst1.amountPaid).toBe(100000);
      expect(inst1.status).toBe(InstallmentStatus.PAID);

      // Inst 2 should receive remaining 30,000 and become PARTIAL (amountPaid = 30,000)
      expect(inst2.amountPaid).toBe(30000);
      expect(inst2.status).toBe(InstallmentStatus.PARTIAL);

      expect(result.allocations.length).toBe(2);
      expect(result.allocations[0].allocatedAmount).toBe(50000);
      expect(result.allocations[1].allocatedAmount).toBe(30000);
      expect(result.unallocatedAmount).toBe(0);
      expect(result.allPaid).toBe(false);

      expect(mockBookingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: BookingStatus.PARTIALLY_PAID }),
      );
    });

    it('should transition booking to CONFIRMED when all installments are fully PAID', async () => {
      const inst1: Installment = {
        id: 'inst-1',
        bookingId: 'booking-1',
        sequence: 1,
        amountDue: 50000,
        amountPaid: 0,
        dueDate: '2026-11-01',
        graceEndDate: '2026-11-10',
        status: InstallmentStatus.PENDING,
        booking: null as any,
      };

      mockInstallmentsRepository.find.mockResolvedValue([inst1]);
      mockBookingsRepository.findOne.mockResolvedValue({
        id: 'booking-1',
        status: BookingStatus.HELD,
      });

      const result = await service.allocatePayment('booking-1', 'pay-1', 50000);

      expect(inst1.status).toBe(InstallmentStatus.PAID);
      expect(result.allPaid).toBe(true);
      expect(mockBookingsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: BookingStatus.CONFIRMED }),
      );
    });
  });

  describe('markOverdueInstallments', () => {
    it('should mark past grace period installments as OVERDUE', async () => {
      const overdueInst: Installment = {
        id: 'inst-overdue',
        bookingId: 'booking-1',
        sequence: 1,
        amountDue: 50000,
        amountPaid: 0,
        dueDate: '2020-01-01',
        graceEndDate: '2020-01-10',
        status: InstallmentStatus.PENDING,
        booking: null as any,
      };

      const mockQb = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([overdueInst]),
      };

      mockInstallmentsRepository.createQueryBuilder.mockReturnValue(mockQb);

      const count = await service.markOverdueInstallments();

      expect(count).toBe(1);
      expect(overdueInst.status).toBe(InstallmentStatus.OVERDUE);
      expect(mockInstallmentsRepository.save).toHaveBeenCalled();
    });
  });
});
