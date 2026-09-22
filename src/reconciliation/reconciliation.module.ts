import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ReconciliationRecord } from './entities/reconciliation-record.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { ReconciliationService } from './reconciliation.service.js';
import { ReconciliationController } from './reconciliation.controller.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([ReconciliationRecord, Payment, AuditLog]),
  ],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
  exports: [ReconciliationService, TypeOrmModule],
})
export class ReconciliationModule {}
