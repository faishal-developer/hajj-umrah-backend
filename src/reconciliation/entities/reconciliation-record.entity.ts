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
import { Payment } from '../../payments/entities/payment.entity.js';
import { ReconciliationStatus } from '../enums/reconciliation-status.enum.js';

@Entity('reconciliation_records')
@Index('idx_reconciliation_provider_trx', ['provider', 'gatewayTransactionId'])
export class ReconciliationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId: string | null;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment: Relation<Payment> | null;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ name: 'gateway_transaction_id', type: 'varchar', length: 255 })
  gatewayTransactionId: string;

  @Column({ name: 'internal_amount', type: 'integer', default: 0 })
  internalAmount: number;

  @Column({ name: 'gateway_amount', type: 'integer', default: 0 })
  gatewayAmount: number;

  @Column({ type: 'integer', default: 0 })
  difference: number; // gatewayAmount - internalAmount

  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.MATCHED,
  })
  status: ReconciliationStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
