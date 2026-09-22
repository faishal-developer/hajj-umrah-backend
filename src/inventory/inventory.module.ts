import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { InventoryItem } from './entities/inventory-item.entity.js';
import { InventoryTransaction } from './entities/inventory-transaction.entity.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([InventoryItem, InventoryTransaction, AuditLog]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService, TypeOrmModule],
})
export class InventoryModule {}
