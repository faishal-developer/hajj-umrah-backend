import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { VendorsService } from './vendors.service.js';
import { Vendor } from './entities/vendor.entity.js';
import { VendorExpense } from './entities/vendor-expense.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { PaymentStatus } from '../payments/enums/payment-status.enum.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('VendorsService', () => {
  let service: VendorsService;
  let mockVendorsRepository: any;
  let mockExpensesRepository: any;
  let mockPaymentsRepository: any;
  let mockAuditLogsRepository: any;

  const mockAdmin: User = {
    id: 'admin-1-id',
    name: 'Admin User',
    email: 'admin@example.com',
    phone: null,
    passwordHash: 'hashed',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVendor: Vendor = {
    id: 'vendor-1',
    name: 'Makkah Royal Hotel',
    type: 'HOTEL',
    currency: 'SAR',
    contactPerson: 'Ahmed',
    phone: '+966500000000',
    email: 'ahmed@makkahhotel.com',
    address: 'Ajyad, Makkah',
    createdAt: new Date(),
    updatedAt: new Date(),
    expenses: [],
  };

  const mockExpense: VendorExpense = {
    id: 'exp-1',
    vendorId: 'vendor-1',
    vendor: mockVendor,
    packageId: 'pkg-1',
    package: null,
    description: 'Hotel booking for 50 pilgrims',
    amount: 10000,
    currency: 'SAR',
    exchangeRate: 32.5,
    bdtValue: 325000,
    paymentDate: '2026-05-01',
    paymentReference: 'INV-9001',
    createdBy: mockAdmin.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockVendorsRepository = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'new-vendor-id', ...dto })),
      save: vi.fn().mockImplementation((v) => Promise.resolve({ id: v.id || 'new-vendor-id', ...v })),
      find: vi.fn().mockResolvedValue([mockVendor]),
      findOne: vi.fn().mockResolvedValue(mockVendor),
    };

    mockExpensesRepository = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'new-exp-id', ...dto })),
      save: vi.fn().mockImplementation((e) => Promise.resolve({ id: e.id || 'new-exp-id', ...e })),
      find: vi.fn().mockResolvedValue([mockExpense]),
      findOne: vi.fn().mockResolvedValue(mockExpense),
    };

    const mockPaymentsQueryBuilder = {
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([
        { id: 'pay-1', amount: 1000000, status: PaymentStatus.SUCCESS },
      ]),
    };

    mockPaymentsRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(mockPaymentsQueryBuilder),
    };

    mockAuditLogsRepository = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'audit-1', ...dto })),
      save: vi.fn().mockImplementation((a) => Promise.resolve({ id: a.id || 'audit-1', ...a })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        {
          provide: getRepositoryToken(Vendor),
          useValue: mockVendorsRepository,
        },
        {
          provide: getRepositoryToken(VendorExpense),
          useValue: mockExpensesRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentsRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogsRepository,
        },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
  });

  describe('createVendor', () => {
    it('should create vendor with default SAR currency and write audit log', async () => {
      const result = await service.createVendor(
        {
          name: 'Madinah Transport Co',
          type: 'TRANSPORT',
        },
        mockAdmin,
      );

      expect(result.name).toBe('Madinah Transport Co');
      expect(result.currency).toBe('SAR');
      expect(mockAuditLogsRepository.save).toHaveBeenCalled();
    });
  });

  describe('recordExpense', () => {
    it('should record expense in SAR and calculate BDT value with exchange rate', async () => {
      const result = await service.recordExpense(
        {
          vendor_id: 'vendor-1',
          package_id: 'pkg-1',
          description: '50 rooms reservation',
          amount: 10000, // 10,000 SAR
          currency: 'SAR',
          exchange_rate: 32.5, // 1 SAR = 32.5 BDT
          payment_date: '2026-05-01',
          payment_reference: 'TRANS-1234',
        },
        mockAdmin,
      );

      expect(result.amount).toBe(10000);
      expect(result.currency).toBe('SAR');
      expect(result.exchangeRate).toBe(32.5);
      expect(result.bdtValue).toBe(325000); // 10000 * 32.5
      expect(result.createdBy).toBe(mockAdmin.id);
      expect(mockAuditLogsRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if vendor does not exist', async () => {
      mockVendorsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.recordExpense(
          {
            vendor_id: 'unknown-vendor',
            description: 'Test',
            amount: 500,
            currency: 'SAR',
            payment_date: '2026-05-01',
          },
          mockAdmin,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFinancialSummary', () => {
    it('should report total BDT collections vs total vendor expenses with currency breakdown', async () => {
      mockExpensesRepository.find.mockResolvedValue([
        {
          id: 'e1',
          amount: 10000,
          currency: 'SAR',
          bdtValue: 325000,
        },
        {
          id: 'e2',
          amount: 50000,
          currency: 'BDT',
          bdtValue: 50000,
        },
      ]);

      const result = await service.getFinancialSummary();

      expect(result.totalBdtCollected).toBe(1000000);
      expect(result.totalBdtExpenses).toBe(375000); // 325000 + 50000
      expect(result.netMargin).toBe(625000); // 1000000 - 375000
      expect(result.currencyBreakdown['SAR']).toBe(10000);
      expect(result.currencyBreakdown['BDT']).toBe(50000);
      expect(result.totalExpenseCount).toBe(2);
      expect(result.totalPaymentCount).toBe(1);
    });
  });

  describe('findAllVendors and findVendorById', () => {
    it('should return all vendors', async () => {
      const result = await service.findAllVendors();
      expect(result).toEqual([mockVendor]);
    });

    it('should return vendor with expense history', async () => {
      const result = await service.findVendorById('vendor-1');
      expect(result).toEqual(mockVendor);
    });

    it('should throw NotFoundException if vendor not found by id', async () => {
      mockVendorsRepository.findOne.mockResolvedValue(null);
      await expect(service.findVendorById('unknown')).rejects.toThrow(NotFoundException);
    });
  });
});
