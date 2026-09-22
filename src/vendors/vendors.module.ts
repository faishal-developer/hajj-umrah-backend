import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Vendor } from './entities/vendor.entity.js';
import { VendorExpense } from './entities/vendor-expense.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { VendorsService } from './vendors.service.js';
import { VendorsController } from './vendors.controller.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Vendor, VendorExpense, Payment, AuditLog]),
  ],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService, TypeOrmModule],
})
export class VendorsModule {}
