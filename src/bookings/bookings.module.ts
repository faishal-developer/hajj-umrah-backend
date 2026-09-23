import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Booking } from './entities/booking.entity.js';
import { BookingPilgrim } from './entities/booking-pilgrim.entity.js';
import { SeatReservation } from './entities/seat-reservation.entity.js';
import { IdempotencyRecord } from '../common/entities/idempotency-record.entity.js';
import { BookingsService } from './bookings.service.js';
import { BookingsController } from './bookings.controller.js';
import { SeatReservationModule } from '../seat-reservation/seat-reservation.module.js';
import { IdempotencyService } from '../common/services/idempotency.service.js';
import { InstallmentsModule } from '../installments/installments.module.js';

import { BookingExpirationScheduler } from './jobs/booking-expiration.scheduler.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([
      Booking,
      BookingPilgrim,
      SeatReservation,
      IdempotencyRecord,
    ]),
    SeatReservationModule,
    forwardRef(() => InstallmentsModule),
  ],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    IdempotencyService,
    BookingExpirationScheduler,
  ],
  exports: [BookingsService, TypeOrmModule],
})
export class BookingsModule {}
