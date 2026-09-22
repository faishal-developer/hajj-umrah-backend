import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity.js';
import { Installment } from './installment.entity.js';

@Entity('payment_allocations')
export class PaymentAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => Payment, (payment) => payment.allocations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ name: 'installment_id', type: 'uuid' })
  installmentId: string;

  @ManyToOne(() => Installment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'installment_id' })
  installment: Installment;

  @Column({ name: 'allocated_amount', type: 'integer' })
  allocatedAmount: number;
}
