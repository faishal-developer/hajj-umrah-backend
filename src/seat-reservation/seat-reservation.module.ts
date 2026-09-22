import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatReservation } from '../bookings/entities/seat-reservation.entity.js';
import { PackageTier } from '../packages/entities/package-tier.entity.js';
import { SeatReservationService } from './seat-reservation.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SeatReservation, PackageTier])],
  providers: [SeatReservationService],
  exports: [SeatReservationService, TypeOrmModule],
})
export class SeatReservationModule {}
