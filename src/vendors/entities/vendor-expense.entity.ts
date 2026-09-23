import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity.js';
import { Package } from '../../packages/entities/package.entity.js';

@Entity('vendor_expenses')
@Index('idx_vendor_expense_vendor_id', ['vendorId'])
@Index('idx_vendor_expense_package_id', ['packageId'])
export class VendorExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => Vendor, (vendor) => vendor.expenses, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Relation<Vendor>;

  @Column({ name: 'package_id', type: 'uuid', nullable: true })
  packageId: string | null;

  @ManyToOne(() => Package, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'package_id' })
  package: Relation<Package> | null;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number; // In original currency (e.g. SAR)

  @Column({ type: 'varchar', length: 10, default: 'SAR' })
  currency: string; // SAR, USD, BDT

  @Column({ name: 'exchange_rate', type: 'numeric', precision: 10, scale: 4, default: 1.0 })
  exchangeRate: number; // e.g. 1 SAR = 32.5 BDT

  @Column({ name: 'bdt_value', type: 'integer' })
  bdtValue: number; // Math.round(amount * exchangeRate)

  @Column({ name: 'payment_date', type: 'varchar', length: 30 })
  paymentDate: string;

  @Column({ name: 'payment_reference', type: 'varchar', length: 255, nullable: true })
  paymentReference: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
