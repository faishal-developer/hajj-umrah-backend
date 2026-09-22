import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum GatewayEventStatus {
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  DUPLICATE = 'DUPLICATE',
  IGNORED = 'IGNORED',
}

@Entity('payment_gateway_events')
@Index('idx_gateway_event_provider_id', ['provider', 'eventId'], { unique: true })
export class PaymentGatewayEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ name: 'event_id', type: 'varchar', length: 255 })
  eventId: string;

  @Column({ name: 'transaction_id', type: 'varchar', length: 255, nullable: true })
  transactionId: string | null;

  @Column({ name: 'event_type', type: 'varchar', length: 100, default: 'payment.updated' })
  eventType: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: GatewayEventStatus,
    default: GatewayEventStatus.PROCESSED,
  })
  status: GatewayEventStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
