import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity.js';
import { InventoryTransactionType } from '../enums/inventory-transaction-type.enum.js';

@Entity('inventory_transactions')
@Index('idx_inventory_tx_item_id', ['itemId'])
@Index('idx_inventory_tx_booking_id', ['bookingId'])
export class InventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @ManyToOne(() => InventoryItem, (item) => item.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item: InventoryItem;

  @Column({
    type: 'enum',
    enum: InventoryTransactionType,
  })
  type: InventoryTransactionType;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId: string | null;

  @Column({ name: 'pilgrim_id', type: 'uuid', nullable: true })
  pilgrimId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'stock_after', type: 'integer' })
  stockAfter: number; // Snapshot of inventory level after transaction

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
