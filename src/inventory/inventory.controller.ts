import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { InventoryService } from './inventory.service.js';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto.js';
import { RecordInventoryTransactionDto } from './dto/record-inventory-transaction.dto.js';
import { InventoryTransactionType } from './enums/inventory-transaction-type.enum.js';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * POST /inventory/items
   * Creates a new inventory item.
   */
  @Post('items')
  async createItem(
    @Body() dto: CreateInventoryItemDto,
    @CurrentUser() currentAdmin: User,
  ) {
    return this.inventoryService.createItem(dto, currentAdmin);
  }

  /**
   * GET /inventory/items
   * Lists all inventory items with stock levels.
   */
  @Get('items')
  async getAllItems(@Query('category') category?: string) {
    return this.inventoryService.findAllItems(category);
  }

  /**
   * GET /inventory/items/:id
   * Retrieves single item with its transaction ledger.
   */
  @Get('items/:id')
  async getItemById(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findItemById(id);
  }

  /**
   * POST /inventory/transactions
   * Records stock movement (PURCHASE, ISSUE, RETURN, ADJUSTMENT).
   */
  @Post('transactions')
  async recordTransaction(
    @Body() dto: RecordInventoryTransactionDto,
    @CurrentUser() currentAdmin: User,
  ) {
    return this.inventoryService.recordTransaction(dto, currentAdmin);
  }

  /**
   * GET /inventory/transactions
   * Retrieves transaction ledger with optional filters.
   */
  @Get('transactions')
  async getAllTransactions(
    @Query('item_id') itemId?: string,
    @Query('type') type?: InventoryTransactionType,
    @Query('booking_id') bookingId?: string,
  ) {
    return this.inventoryService.findAllTransactions(itemId, type, bookingId);
  }
}
