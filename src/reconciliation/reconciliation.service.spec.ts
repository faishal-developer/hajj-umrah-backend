import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service.js';
import { ReconciliationRecord } from './entities/reconciliation-record.entity.js';
import { ReconciliationStatus } from './enums/reconciliation-status.enum.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let mockRecordsRepository: any;
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

  const mockPayment: Payment = {
    id: 'pay-123',
    bookingId: 'book-123',
    provider: 'BKASH',
    method: 'WALLET',
    amount: 50000,
    currency: 'BDT',
    gatewayTransactionId: 'TRX-1001',
    status: null as any,
    createdBy: null,
    approvedBy: null,
    createdAt: new Date(),
    booking: null as any,
    allocations: [],
  };

  const mockReconciliationRecord: ReconciliationRecord = {
    id: 'rec-1',
    paymentId: 'pay-123',
    payment: mockPayment,
    provider: 'BKASH',
    gatewayTransactionId: 'TRX-1001',
    internalAmount: 50000,
    gatewayAmount: 50000,
    difference: 0,
    status: ReconciliationStatus.MATCHED,
    notes: null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRecordsRepository = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'new-rec-id', ...dto })),
      save: vi.fn().mockImplementation((r) => Promise.resolve({ id: r.id || 'new-rec-id', ...r })),
      find: vi.fn().mockResolvedValue([mockReconciliationRecord]),
      findOne: vi.fn().mockResolvedValue(mockReconciliationRecord),
    };

    mockPaymentsRepository = {
      findOne: vi.fn(),
      save: vi.fn(), // Should never be called during reconciliation!
    };

    mockAuditLogsRepository = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'audit-1', ...dto })),
      save: vi.fn().mockImplementation((a) => Promise.resolve({ id: a.id || 'audit-1', ...a })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        {
          provide: getRepositoryToken(ReconciliationRecord),
          useValue: mockRecordsRepository,
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

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  describe('reconcileBatch', () => {
    it('should correctly match settlement when gateway amount equals internal amount (difference = 0)', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(mockPayment); // internalAmount = 50000

      const result = await service.reconcileBatch(
        {
          provider: 'BKASH',
          settlements: [
            {
              transaction_id: 'TRX-1001',
              amount: 50000,
            },
          ],
        },
        mockAdmin,
      );

      expect(result.totalProcessed).toBe(1);
      expect(result.matchedCount).toBe(1);
      expect(result.mismatchCount).toBe(0);
      expect(result.records[0].status).toBe(ReconciliationStatus.MATCHED);
      expect(result.records[0].difference).toBe(0);

      // Verify payment was NOT silently mutated
      expect(mockPaymentsRepository.save).not.toHaveBeenCalled();
    });

    it('should flag MISMATCH when gateway amount differs from internal amount without altering payment', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(mockPayment); // internal = 50000, gateway = 48000

      const result = await service.reconcileBatch(
        {
          provider: 'BKASH',
          settlements: [
            {
              transaction_id: 'TRX-1001',
              amount: 48000,
            },
          ],
        },
        mockAdmin,
      );

      expect(result.totalProcessed).toBe(1);
      expect(result.matchedCount).toBe(0);
      expect(result.mismatchCount).toBe(1);
      expect(result.records[0].status).toBe(ReconciliationStatus.MISMATCH);
      expect(result.records[0].difference).toBe(-2000); // 48000 - 50000

      // Verify payment was NOT silently modified
      expect(mockPaymentsRepository.save).not.toHaveBeenCalled();
    });

    it('should flag MISMATCH for unmatched gateway transactions not recorded internally', async () => {
      mockPaymentsRepository.findOne.mockResolvedValue(null); // Not found

      const result = await service.reconcileBatch(
        {
          provider: 'BKASH',
          settlements: [
            {
              transaction_id: 'TRX-UNKNOWN',
              amount: 25000,
            },
          ],
        },
        mockAdmin,
      );

      expect(result.records[0].status).toBe(ReconciliationStatus.MISMATCH);
      expect(result.records[0].internalAmount).toBe(0);
      expect(result.records[0].difference).toBe(25000);
      expect(result.records[0].notes).toContain('Unmatched gateway transaction');
    });
  });

  describe('updateStatus', () => {
    it('should update status to RESOLVED, record resolvedBy, and write audit log', async () => {
      const mismatchRecord: ReconciliationRecord = {
        ...mockReconciliationRecord,
        status: ReconciliationStatus.MISMATCH,
        difference: -500,
      };
      mockRecordsRepository.findOne.mockResolvedValue(mismatchRecord);

      const result = await service.updateStatus(
        'rec-1',
        {
          status: ReconciliationStatus.RESOLVED,
          notes: 'Gateway fee discrepancy verified with bank manager',
        },
        mockAdmin,
      );

      expect(result.status).toBe(ReconciliationStatus.RESOLVED);
      expect(result.resolvedBy).toBe(mockAdmin.id);
      expect(result.notes).toBe('Gateway fee discrepancy verified with bank manager');
      expect(mockAuditLogsRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if record does not exist', async () => {
      mockRecordsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          'unknown-id',
          { status: ReconciliationStatus.UNDER_REVIEW },
          mockAdmin,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findDiscrepancies', () => {
    it('should query records with status MISMATCH or UNDER_REVIEW', async () => {
      await service.findDiscrepancies('BKASH');
      expect(mockRecordsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            provider: 'BKASH',
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return record by id', async () => {
      const result = await service.findById('rec-1');
      expect(result).toEqual(mockReconciliationRecord);
    });
  });
});
