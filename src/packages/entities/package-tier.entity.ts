import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  VersionColumn,
} from 'typeorm';
import { Package } from './package.entity.js';

@Entity('package_tiers')
export class PackageTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'package_id', type: 'uuid' })
  packageId: string;

  @ManyToOne(() => Package, (pkg) => pkg.tiers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'package_id' })
  package: Relation<Package>;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'integer' })
  price: number;

  @Column({ type: 'integer' })
  quota: number;

  @Column({ name: 'held_seats', type: 'integer', default: 0 })
  heldSeats: number;

  @Column({ name: 'confirmed_seats', type: 'integer', default: 0 })
  confirmedSeats: number;

  @VersionColumn({ default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
