import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { CancellationPilgrim } from './cancellation-pilgrim.entity.js';

@Entity('cancellations')
export class Cancellation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'cancellation_fee', type: 'integer', default: 0 })
  cancellationFee: number;

  @Column({ type: 'varchar', length: 30, default: 'REQUESTED' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(
    () => CancellationPilgrim,
    (cancellationPilgrim) => cancellationPilgrim.cancellation,
    { cascade: true },
  )
  pilgrims: CancellationPilgrim[];
}
