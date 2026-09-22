import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { BookingStatus } from '../enums/booking-status.enum.js';
import { PaymentMode } from '../enums/payment-mode.enum.js';
import { BookingPilgrim } from './booking-pilgrim.entity.js';
import { SeatReservation } from './seat-reservation.entity.js';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'package_id', type: 'uuid' })
  packageId: string;

  @Column({ name: 'tier_id', type: 'uuid' })
  tierId: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.HELD,
  })
  status: BookingStatus;

  @Column({
    name: 'payment_mode',
    type: 'enum',
    enum: PaymentMode,
  })
  paymentMode: PaymentMode;

  @Column({ name: 'tier_name_snapshot', type: 'varchar', length: 100 })
  tierNameSnapshot: string;

  @Column({ name: 'unit_price_snapshot', type: 'integer' })
  unitPriceSnapshot: number;

  @Column({ name: 'total_amount', type: 'integer' })
  totalAmount: number;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @VersionColumn({ default: 1 })
  version: number;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => BookingPilgrim, (pilgrim) => pilgrim.booking, {
    cascade: true,
  })
  pilgrims: BookingPilgrim[];

  @OneToMany(() => SeatReservation, (seat) => seat.booking, {
    cascade: true,
  })
  seatReservations: SeatReservation[];
}
