import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cancellation } from './cancellation.entity.js';
import { BookingPilgrim } from '../../bookings/entities/booking-pilgrim.entity.js';

@Entity('cancellation_pilgrims')
export class CancellationPilgrim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cancellation_id', type: 'uuid' })
  cancellationId: string;

  @ManyToOne(() => Cancellation, (cancellation) => cancellation.pilgrims, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cancellation_id' })
  cancellation: Cancellation;

  @Column({ name: 'pilgrim_id', type: 'uuid' })
  pilgrimId: string;

  @ManyToOne(() => BookingPilgrim, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'pilgrim_id' })
  pilgrim: BookingPilgrim;
}
