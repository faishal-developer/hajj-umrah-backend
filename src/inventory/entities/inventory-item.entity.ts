import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { InventoryTransaction } from './inventory-transaction.entity.js';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index('idx_inventory_item_sku', { unique: true })
  sku: string; // e.g. IHRAM-M, BAG-TRAVEL, SIM-SAUDI

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50, default: 'SUPPLIES' })
  category: string; // CLOTHING, LUGGAGE, TELECOM, SUPPLIES

  @Column({ name: 'stock_quantity', type: 'integer', default: 0 })
  stockQuantity: number;

  @Column({ name: 'unit_cost', type: 'integer', default: 0 })
  unitCost: number; // in BDT

  @VersionColumn({ default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => InventoryTransaction, (t) => t.item, { cascade: true })
  transactions: Relation<InventoryTransaction[]>;
}
