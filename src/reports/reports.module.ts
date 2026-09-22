import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { Installment } from '../payments/entities/installment.entity.js';
import { Refund } from '../cancellations/entities/refund.entity.js';
import { PackageTier } from '../packages/entities/package-tier.entity.js';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      Payment,
      Installment,
      Refund,
      PackageTier,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
