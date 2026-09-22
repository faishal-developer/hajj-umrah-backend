import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationController } from './reconciliation.controller.js';
import { ReconciliationService } from './reconciliation.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { ReconciliationStatus } from './enums/reconciliation-status.enum.js';

describe('ReconciliationController', () => {
  let controller: ReconciliationController;
  let service: ReconciliationService;

  const mockAdmin: User = {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    phone: null,
    passwordHash: 'hashed',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    reconcileBatch: vi.fn(),
    findDiscrepancies: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReconciliationController],
      providers: [
        {
          provide: ReconciliationService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReconciliationController>(ReconciliationController);
    service = module.get<ReconciliationService>(ReconciliationService);
  });

  it('reconcileBatch should invoke service.reconcileBatch', async () => {
    const dto = {
      provider: 'BKASH',
      settlements: [{ transaction_id: 'TRX-1', amount: 50000 }],
    };
    mockService.reconcileBatch.mockResolvedValue({ totalProcessed: 1 });

    const result = await controller.reconcileBatch(dto, mockAdmin);
    expect(mockService.reconcileBatch).toHaveBeenCalledWith(dto, mockAdmin);
    expect(result).toEqual({ totalProcessed: 1 });
  });

  it('getDiscrepancies should invoke service.findDiscrepancies', async () => {
    mockService.findDiscrepancies.mockResolvedValue([]);
    const result = await controller.getDiscrepancies('BKASH');
    expect(mockService.findDiscrepancies).toHaveBeenCalledWith('BKASH');
    expect(result).toEqual([]);
  });

  it('getAll should invoke service.findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    const result = await controller.getAll('BKASH', ReconciliationStatus.MATCHED);
    expect(mockService.findAll).toHaveBeenCalledWith('BKASH', ReconciliationStatus.MATCHED);
    expect(result).toEqual([]);
  });

  it('getById should invoke service.findById', async () => {
    mockService.findById.mockResolvedValue({ id: 'rec-1' });
    const result = await controller.getById('rec-1');
    expect(mockService.findById).toHaveBeenCalledWith('rec-1');
    expect(result).toEqual({ id: 'rec-1' });
  });

  it('updateStatus should invoke service.updateStatus', async () => {
    const dto = { status: ReconciliationStatus.RESOLVED, notes: 'Resolved discrepancy' };
    mockService.updateStatus.mockResolvedValue({ id: 'rec-1', status: ReconciliationStatus.RESOLVED });

    const result = await controller.updateStatus('rec-1', dto, mockAdmin);
    expect(mockService.updateStatus).toHaveBeenCalledWith('rec-1', dto, mockAdmin);
    expect(result.status).toBe(ReconciliationStatus.RESOLVED);
  });
});
