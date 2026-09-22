import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { InventoryTransactionType } from './enums/inventory-transaction-type.enum.js';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: InventoryService;

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
    createItem: vi.fn(),
    findAllItems: vi.fn(),
    findItemById: vi.fn(),
    recordTransaction: vi.fn(),
    findAllTransactions: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
  });

  it('createItem should invoke service.createItem', async () => {
    const dto = { sku: 'SIM-SAUDI', name: 'Saudi STC SIM Card', category: 'TELECOM' };
    mockService.createItem.mockResolvedValue({ id: 'item-sim', ...dto });

    const result = await controller.createItem(dto, mockAdmin);
    expect(mockService.createItem).toHaveBeenCalledWith(dto, mockAdmin);
    expect(result.id).toBe('item-sim');
  });

  it('getAllItems should invoke service.findAllItems', async () => {
    mockService.findAllItems.mockResolvedValue([]);
    const result = await controller.getAllItems('TELECOM');
    expect(mockService.findAllItems).toHaveBeenCalledWith('TELECOM');
    expect(result).toEqual([]);
  });

  it('getItemById should invoke service.findItemById', async () => {
    mockService.findItemById.mockResolvedValue({ id: 'item-1' });
    const result = await controller.getItemById('item-1');
    expect(mockService.findItemById).toHaveBeenCalledWith('item-1');
    expect(result).toEqual({ id: 'item-1' });
  });

  it('recordTransaction should invoke service.recordTransaction', async () => {
    const dto = {
      item_id: 'item-1',
      type: InventoryTransactionType.ISSUE,
      quantity: 5,
    };
    mockService.recordTransaction.mockResolvedValue({ transaction: { id: 'tx-1' } });

    const result = await controller.recordTransaction(dto, mockAdmin);
    expect(mockService.recordTransaction).toHaveBeenCalledWith(dto, mockAdmin);
    expect(result).toEqual({ transaction: { id: 'tx-1' } });
  });

  it('getAllTransactions should invoke service.findAllTransactions', async () => {
    mockService.findAllTransactions.mockResolvedValue([]);
    const result = await controller.getAllTransactions('item-1', InventoryTransactionType.ISSUE, 'b-1');
    expect(mockService.findAllTransactions).toHaveBeenCalledWith('item-1', InventoryTransactionType.ISSUE, 'b-1');
    expect(result).toEqual([]);
  });
});
