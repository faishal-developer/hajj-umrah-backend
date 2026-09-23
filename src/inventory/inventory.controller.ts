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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
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
  @ApiOperation({
    summary: 'Create inventory item (Admin)',
    description: 'Registers a trackable physical item (Ihram, Luggage Bag, STC SIM card) with initial stock balance.',
  })
  @ApiResponse({ status: 201, description: 'Inventory item created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 409, description: 'Item with SKU already exists.' })
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
  @ApiOperation({
    summary: 'List all inventory items (Admin)',
    description: 'Retrieves all inventory items and current available stock balances.',
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by item category' })
  @ApiResponse({ status: 200, description: 'Items list returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getAllItems(@Query('category') category?: string) {
    return this.inventoryService.findAllItems(category);
  }

  /**
   * GET /inventory/items/:id
   * Retrieves single item with its transaction ledger.
   */
  @Get('items/:id')
  @ApiOperation({
    summary: 'Get item details and transaction history (Admin)',
    description: 'Retrieves item details and chronological movement ledger.',
  })
  @ApiParam({ name: 'id', description: 'Item UUID', type: String })
  @ApiResponse({ status: 200, description: 'Item details returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Item not found.' })
  async getItemById(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findItemById(id);
  }

  /**
   * POST /inventory/transactions
   * Records stock movement (PURCHASE, ISSUE, RETURN, ADJUSTMENT).
   */
  @Post('transactions')
  @ApiOperation({
    summary: 'Record inventory stock transaction (Admin)',
    description: 'Records stock in/out movement (PURCHASE, ISSUE, RETURN, ADJUSTMENT) with stock insufficiency validation.',
  })
  @ApiResponse({ status: 201, description: 'Transaction recorded and stock updated.' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or invalid input.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Item not found.' })
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
  @ApiOperation({
    summary: 'List all inventory transactions (Admin)',
    description: 'Retrieves complete inventory audit ledger with item, type, and booking filters.',
  })
  @ApiQuery({ name: 'item_id', required: false, description: 'Filter by item UUID' })
  @ApiQuery({ name: 'type', required: false, enum: InventoryTransactionType, description: 'Filter by transaction type' })
  @ApiQuery({ name: 'booking_id', required: false, description: 'Filter by associated booking UUID' })
  @ApiResponse({ status: 200, description: 'Transaction ledger returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getAllTransactions(
    @Query('item_id') itemId?: string,
    @Query('type') type?: InventoryTransactionType,
    @Query('booking_id') bookingId?: string,
  ) {
    return this.inventoryService.findAllTransactions(itemId, type, bookingId);
  }
}
