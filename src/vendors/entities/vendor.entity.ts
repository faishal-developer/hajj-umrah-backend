import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VendorExpense } from './vendor-expense.entity.js';

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50, default: 'OTHER' })
  type: string; // HOTEL, TRANSPORT, AIRLINE, VISA, CATERING, OTHER

  @Column({ type: 'varchar', length: 10, default: 'SAR' })
  currency: string; // Default SAR, supports USD, BDT, etc.

  @Column({ name: 'contact_person', type: 'varchar', length: 100, nullable: true })
  contactPerson: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => VendorExpense, (expense) => expense.vendor, { cascade: true })
  expenses: VendorExpense[];
}
