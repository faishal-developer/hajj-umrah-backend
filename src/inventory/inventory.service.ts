import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity.js';
import { InventoryTransaction } from './entities/inventory-transaction.entity.js';
import { InventoryTransactionType } from './enums/inventory-transaction-type.enum.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto.js';
import { RecordInventoryTransactionDto } from './dto/record-inventory-transaction.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemsRepository: Repository<InventoryItem>,
    @InjectRepository(InventoryTransaction)
    private readonly transactionsRepository: Repository<InventoryTransaction>,
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a new pilgrim inventory item (e.g. Ihram, Bag, SIM).
   */
  async createItem(
    dto: CreateInventoryItemDto,
    currentAdmin: User,
  ): Promise<InventoryItem> {
    const existing = await this.itemsRepository.findOne({
      where: { sku: dto.sku.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Inventory item with SKU "${dto.sku}" already exists`);
    }

    const initialStock = dto.initial_stock || 0;
    const item = this.itemsRepository.create({
      sku: dto.sku.toUpperCase(),
      name: dto.name,
      category: dto.category ? dto.category.toUpperCase() : 'SUPPLIES',
      stockQuantity: initialStock,
      unitCost: dto.unit_cost || 0,
    });

    const savedItem = await this.itemsRepository.save(item);

    // If initial stock > 0, record initial purchase transaction
    if (initialStock > 0) {
      const initialTx = this.transactionsRepository.create({
        itemId: savedItem.id,
        type: InventoryTransactionType.PURCHASE,
        quantity: initialStock,
        stockAfter: initialStock,
        notes: 'Initial stock on creation',
        createdBy: currentAdmin.id,
      });
      await this.transactionsRepository.save(initialTx);
    }

    // Audit Log
    const audit = this.auditLogsRepository.create({
      actorId: currentAdmin.id,
      action: 'INVENTORY_ITEM_CREATED',
      entityType: 'InventoryItem',
      entityId: savedItem.id,
      oldValue: null,
      newValue: { sku: savedItem.sku, name: savedItem.name, initialStock },
    });
    await this.auditLogsRepository.save(audit);

    return savedItem;
  }

  /**
   * Records an inventory transaction (PURCHASE, ISSUE, RETURN, ADJUSTMENT).
   * Transactional with pessimistic row lock to prevent stock race conditions.
   * Decreases stock on ISSUE and throws BadRequestException if stock is insufficient.
   */
  async recordTransaction(
    dto: RecordInventoryTransactionDto,
    currentAdmin: User,
  ): Promise<{ transaction: InventoryTransaction; item: InventoryItem }> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const itemRepo = manager.getRepository(InventoryItem);
      const txRepo = manager.getRepository(InventoryTransaction);
      const auditRepo = manager.getRepository(AuditLog);

      // Pessimistic lock row to avoid concurrency issues
      const item = await itemRepo.findOne({
        where: { id: dto.item_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!item) {
        throw new NotFoundException(`Inventory item with ID "${dto.item_id}" not found`);
      }

      const oldStock = item.stockQuantity;
      let newStock = oldStock;

      switch (dto.type) {
        case InventoryTransactionType.PURCHASE:
          newStock = oldStock + dto.quantity;
          break;

        case InventoryTransactionType.ISSUE:
          if (oldStock < dto.quantity) {
            throw new BadRequestException(
              `INSUFFICIENT_STOCK: Requested ${dto.quantity} unit(s) of "${item.name}", but only ${oldStock} available`,
            );
          }
          newStock = oldStock - dto.quantity;
          break;

        case InventoryTransactionType.RETURN:
          newStock = oldStock + dto.quantity;
          break;

        case InventoryTransactionType.ADJUSTMENT:
          newStock = dto.quantity;
          break;
      }

      item.stockQuantity = newStock;
      const savedItem = await itemRepo.save(item);

      const transaction = txRepo.create({
        itemId: item.id,
        type: dto.type,
        quantity: dto.quantity,
        bookingId: dto.booking_id || null,
        pilgrimId: dto.pilgrim_id || null,
        notes: dto.notes || null,
        stockAfter: newStock,
        createdBy: currentAdmin.id,
      });
      const savedTx = await txRepo.save(transaction);

      // Audit Log
      const audit = auditRepo.create({
        actorId: currentAdmin.id,
        action: `INVENTORY_TRANSACTION_${dto.type}`,
        entityType: 'InventoryTransaction',
        entityId: savedTx.id,
        oldValue: { stockQuantity: oldStock },
        newValue: {
          stockQuantity: newStock,
          type: dto.type,
          quantity: dto.quantity,
          bookingId: dto.booking_id,
        },
      });
      await auditRepo.save(audit);

      return {
        transaction: savedTx,
        item: savedItem,
      };
    });
  }

  /**
   * Retrieves all inventory items.
   */
  async findAllItems(category?: string): Promise<InventoryItem[]> {
    const where: any = {};
    if (category) {
      where.category = category.toUpperCase();
    }
    return this.itemsRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  /**
   * Retrieves a single inventory item with transaction history.
   */
  async findItemById(id: string): Promise<InventoryItem> {
    const item = await this.itemsRepository.findOne({
      where: { id },
      relations: ['transactions'],
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID "${id}" not found`);
    }

    return item;
  }

  /**
   * Retrieves all inventory transactions with optional filters.
   */
  async findAllTransactions(
    itemId?: string,
    type?: InventoryTransactionType,
    bookingId?: string,
  ): Promise<InventoryTransaction[]> {
    const where: any = {};
    if (itemId) where.itemId = itemId;
    if (type) where.type = type;
    if (bookingId) where.bookingId = bookingId;

    return this.transactionsRepository.find({
      where,
      relations: ['item'],
      order: { createdAt: 'DESC' },
    });
  }
}
