import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Cancellation } from './entities/cancellation.entity.js';
import { CancellationPilgrim } from './entities/cancellation-pilgrim.entity.js';
import { Refund } from './entities/refund.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { BookingPilgrim } from '../bookings/entities/booking-pilgrim.entity.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { CancellationsService } from './cancellations.service.js';
import { CancellationsController } from './cancellations.controller.js';
import { RefundsController } from './refunds.controller.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { SeatReservationModule } from '../seat-reservation/seat-reservation.module.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([
      Cancellation,
      CancellationPilgrim,
      Refund,
      Payment,
      Booking,
      BookingPilgrim,
      AuditLog,
    ]),
    BookingsModule,
    SeatReservationModule,
  ],
  controllers: [CancellationsController, RefundsController],
  providers: [CancellationsService],
  exports: [CancellationsService, TypeOrmModule],
})
export class CancellationsModule {}
