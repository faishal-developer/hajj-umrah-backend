import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InventoryService } from './inventory.service.js';
import { InventoryItem } from './entities/inventory-item.entity.js';
import { InventoryTransaction } from './entities/inventory-transaction.entity.js';
import { InventoryTransactionType } from './enums/inventory-transaction-type.enum.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockItemsRepository: any;
  let mockTransactionsRepository: any;
  let mockAuditLogsRepository: any;
  let mockDataSource: any;

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

  const mockItem: InventoryItem = {
    id: 'item-1',
    sku: 'IHRAM-M',
    name: 'Ihram (Male)',
    category: 'CLOTHING',
    stockQuantity: 100,
    unitCost: 1500,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    transactions: [],
  };

  const mockTransaction: InventoryTransaction = {
    id: 'tx-1',
    itemId: 'item-1',
    item: mockItem,
    type: InventoryTransactionType.PURCHASE,
    quantity: 100,
    bookingId: null,
    pilgrimId: null,
    notes: 'Initial purchase',
    stockAfter: 100,
    createdBy: mockAdmin.id,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockItemsRepository = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'new-item-id', ...dto })),
      save: vi.fn().mockImplementation((item) => Promise.resolve({ id: item.id || 'new-item-id', ...item })),
      find: vi.fn().mockResolvedValue([mockItem]),
      findOne: vi.fn().mockResolvedValue(mockItem),
    };

    mockTransactionsRepository = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'new-tx-id', ...dto })),
      save: vi.fn().mockImplementation((tx) => Promise.resolve({ id: tx.id || 'new-tx-id', ...tx })),
      find: vi.fn().mockResolvedValue([mockTransaction]),
      findOne: vi.fn().mockResolvedValue(mockTransaction),
    };

    mockAuditLogsRepository = {
      create: vi.fn().mockImplementation((dto) => ({ id: 'audit-1', ...dto })),
      save: vi.fn().mockImplementation((a) => Promise.resolve({ id: a.id || 'audit-1', ...a })),
    };

    mockDataSource = {
      transaction: vi.fn().mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: vi.fn().mockImplementation((entity) => {
            if (entity === InventoryItem) return mockItemsRepository;
            if (entity === InventoryTransaction) return mockTransactionsRepository;
            if (entity === AuditLog) return mockAuditLogsRepository;
            return {};
          }),
          findOne: vi.fn().mockImplementation((entity, options) => {
            if (entity === InventoryItem) return Promise.resolve(mockItemsRepository.findOne(options));
            if (entity === InventoryTransaction) return Promise.resolve(mockTransactionsRepository.findOne(options));
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
        InventoryService,
        {
          provide: getRepositoryToken(InventoryItem),
          useValue: mockItemsRepository,
        },
        {
          provide: getRepositoryToken(InventoryTransaction),
          useValue: mockTransactionsRepository,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogsRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('createItem', () => {
    it('should create new inventory item and record initial transaction if stock > 0', async () => {
      mockItemsRepository.findOne.mockResolvedValue(null); // No conflict

      const result = await service.createItem(
        {
          sku: 'BAG-TRAVEL',
          name: 'Travel Luggage Bag',
          category: 'LUGGAGE',
          initial_stock: 50,
          unit_cost: 2500,
        },
        mockAdmin,
      );

      expect(result.sku).toBe('BAG-TRAVEL');
      expect(result.stockQuantity).toBe(50);
      expect(mockTransactionsRepository.save).toHaveBeenCalled();
      expect(mockAuditLogsRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if item with same SKU exists', async () => {
      mockItemsRepository.findOne.mockResolvedValue(mockItem);

      await expect(
        service.createItem(
          {
            sku: 'IHRAM-M',
            name: 'Duplicate Item',
          },
          mockAdmin,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('recordTransaction', () => {
    it('should increase stock on PURCHASE transaction', async () => {
      mockItemsRepository.findOne.mockResolvedValue({ ...mockItem, stockQuantity: 100 });

      const result = await service.recordTransaction(
        {
          item_id: 'item-1',
          type: InventoryTransactionType.PURCHASE,
          quantity: 50,
          notes: 'Received shipment from supplier',
        },
        mockAdmin,
      );

      expect(result.item.stockQuantity).toBe(150);
      expect(result.transaction.stockAfter).toBe(150);
      expect(mockAuditLogsRepository.save).toHaveBeenCalled();
    });

    it('should decrease stock on ISSUE transaction when stock is available', async () => {
      mockItemsRepository.findOne.mockResolvedValue({ ...mockItem, stockQuantity: 100 });

      const result = await service.recordTransaction(
        {
          item_id: 'item-1',
          type: InventoryTransactionType.ISSUE,
          quantity: 20,
          booking_id: 'book-123',
          notes: 'Issued to pilgrim group',
        },
        mockAdmin,
      );

      expect(result.item.stockQuantity).toBe(80);
      expect(result.transaction.stockAfter).toBe(80);
      expect(result.transaction.bookingId).toBe('book-123');
    });

    it('should throw BadRequestException (INSUFFICIENT_STOCK) when issue quantity exceeds stock', async () => {
      mockItemsRepository.findOne.mockResolvedValue({ ...mockItem, stockQuantity: 15 });

      await expect(
        service.recordTransaction(
          {
            item_id: 'item-1',
            type: InventoryTransactionType.ISSUE,
            quantity: 20, // Only 15 available!
          },
          mockAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should increase stock on RETURN transaction', async () => {
      mockItemsRepository.findOne.mockResolvedValue({ ...mockItem, stockQuantity: 80 });

      const result = await service.recordTransaction(
        {
          item_id: 'item-1',
          type: InventoryTransactionType.RETURN,
          quantity: 5,
          notes: 'Returned unused items',
        },
        mockAdmin,
      );

      expect(result.item.stockQuantity).toBe(85);
      expect(result.transaction.stockAfter).toBe(85);
    });

    it('should set stock level on ADJUSTMENT transaction', async () => {
      mockItemsRepository.findOne.mockResolvedValue({ ...mockItem, stockQuantity: 80 });

      const result = await service.recordTransaction(
        {
          item_id: 'item-1',
          type: InventoryTransactionType.ADJUSTMENT,
          quantity: 75,
          notes: 'Physical inventory audit count adjustment',
        },
        mockAdmin,
      );

      expect(result.item.stockQuantity).toBe(75);
      expect(result.transaction.stockAfter).toBe(75);
    });

    it('should throw NotFoundException if item does not exist', async () => {
      mockItemsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.recordTransaction(
          {
            item_id: 'unknown-id',
            type: InventoryTransactionType.PURCHASE,
            quantity: 10,
          },
          mockAdmin,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllItems & findItemById', () => {
    it('should return all inventory items', async () => {
      const result = await service.findAllItems();
      expect(result).toEqual([mockItem]);
    });

    it('should return item with transaction history', async () => {
      const result = await service.findItemById('item-1');
      expect(result).toEqual(mockItem);
    });
  });
});
