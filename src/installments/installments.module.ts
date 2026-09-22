import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Installment } from '../payments/entities/installment.entity.js';
import { PaymentAllocation } from '../payments/entities/payment-allocation.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { InstallmentsService } from './installments.service.js';
import { InstallmentsController } from './installments.controller.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Installment, PaymentAllocation, Booking]),
  ],
  controllers: [InstallmentsController],
  providers: [InstallmentsService],
  exports: [InstallmentsService, TypeOrmModule],
})
export class InstallmentsModule {}
