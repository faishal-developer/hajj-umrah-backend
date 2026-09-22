import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { PackageStatus } from '../enums/package-status.enum.js';
import { PackageTier } from './package-tier.entity.js';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'departure_date', type: 'date' })
  departureDate: string;

  @Column({ name: 'booking_start_date', type: 'date' })
  bookingStartDate: string;

  @Column({ name: 'booking_end_date', type: 'date' })
  bookingEndDate: string;

  @Column({
    type: 'enum',
    enum: PackageStatus,
    default: PackageStatus.DRAFT,
  })
  status: PackageStatus;

  @VersionColumn({ default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => PackageTier, (tier) => tier.package, {
    cascade: true,
  })
  tiers: PackageTier[];
}
