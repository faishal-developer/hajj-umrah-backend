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
import { VendorsService } from './vendors.service.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { CreateVendorExpenseDto } from './dto/create-vendor-expense.dto.js';

@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  /**
   * POST /vendors
   * Creates a new vendor.
   */
  @Post()
  async createVendor(
    @Body() dto: CreateVendorDto,
    @CurrentUser() currentAdmin: User,
  ) {
    return this.vendorsService.createVendor(dto, currentAdmin);
  }

  /**
   * GET /vendors
   * Lists all vendors.
   */
  @Get()
  async getAllVendors() {
    return this.vendorsService.findAllVendors();
  }

  /**
   * GET /vendors/expenses/financial-summary
   * Returns aggregated financial summary: total BDT collections vs total vendor expenses (SAR/USD/BDT).
   */
  @Get('expenses/financial-summary')
  async getFinancialSummary(@Query('package_id') packageId?: string) {
    return this.vendorsService.getFinancialSummary(packageId);
  }

  /**
   * POST /vendors/expenses
   * Records an operational expense with currency conversion to BDT.
   */
  @Post('expenses')
  async recordExpense(
    @Body() dto: CreateVendorExpenseDto,
    @CurrentUser() currentAdmin: User,
  ) {
    return this.vendorsService.recordExpense(dto, currentAdmin);
  }

  /**
   * GET /vendors/expenses
   * Lists all vendor expenses with optional filters.
   */
  @Get('expenses')
  async getAllExpenses(
    @Query('vendor_id') vendorId?: string,
    @Query('package_id') packageId?: string,
    @Query('currency') currency?: string,
  ) {
    return this.vendorsService.findAllExpenses(vendorId, packageId, currency);
  }

  /**
   * GET /vendors/:id
   * Retrieves single vendor details with associated expense history.
   */
  @Get(':id')
  async getVendorById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorsService.findVendorById(id);
  }
}
