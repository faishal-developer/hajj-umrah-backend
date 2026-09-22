import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Cancellation } from './entities/cancellation.entity.js';
import { CancellationPilgrim } from './entities/cancellation-pilgrim.entity.js';
import { Refund } from './entities/refund.entity.js';
import { CancellationsService } from './cancellations.service.js';
import { CancellationsController } from './cancellations.controller.js';
import { RefundsController } from './refunds.controller.js';
import { BookingsModule } from '../bookings/bookings.module.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Cancellation, CancellationPilgrim, Refund]),
    BookingsModule,
  ],
  controllers: [CancellationsController, RefundsController],
  providers: [CancellationsService],
  exports: [CancellationsService, TypeOrmModule],
})
export class CancellationsModule {}
