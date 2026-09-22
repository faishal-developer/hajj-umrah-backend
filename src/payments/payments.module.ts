import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Payment } from './entities/payment.entity.js';
import { Installment } from './entities/installment.entity.js';
import { PaymentAllocation } from './entities/payment-allocation.entity.js';
import { PaymentGatewayEvent } from './entities/payment-gateway-event.entity.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { InstallmentsModule } from '../installments/installments.module.js';
import { SeatReservationModule } from '../seat-reservation/seat-reservation.module.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([
      Payment,
      Installment,
      PaymentAllocation,
      PaymentGatewayEvent,
      AuditLog,
      Booking,
    ]),
    BookingsModule,
    InstallmentsModule,
    SeatReservationModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService, TypeOrmModule],
})
export class PaymentsModule {}
