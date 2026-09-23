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
import { VendorsService } from './vendors.service.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { CreateVendorExpenseDto } from './dto/create-vendor-expense.dto.js';

@ApiTags('Vendors & Expenses')
@ApiBearerAuth('JWT-auth')
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
  @ApiOperation({
    summary: 'Create a new vendor (Admin)',
    description: 'Registers a third-party vendor (Hotel, Airline, Transport, Visa agency).',
  })
  @ApiResponse({ status: 201, description: 'Vendor created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
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
  @ApiOperation({
    summary: 'List all vendors (Admin)',
    description: 'Retrieves all registered vendor partners.',
  })
  @ApiResponse({ status: 200, description: 'Vendors list returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getAllVendors() {
    return this.vendorsService.findAllVendors();
  }

  /**
   * GET /vendors/expenses/financial-summary
   * Returns aggregated financial summary: total BDT collections vs total vendor expenses (SAR/USD/BDT).
   */
  @Get('expenses/financial-summary')
  @ApiOperation({
    summary: 'Get net margin and financial summary (Admin)',
    description: 'Aggregates gross BDT collections from payments vs operational SAR/USD vendor expenses converted to BDT.',
  })
  @ApiQuery({ name: 'package_id', required: false, description: 'Filter financial summary by package UUID' })
  @ApiResponse({ status: 200, description: 'Financial net summary returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getFinancialSummary(@Query('package_id') packageId?: string) {
    return this.vendorsService.getFinancialSummary(packageId);
  }

  /**
   * POST /vendors/expenses
   * Records an operational expense with currency conversion to BDT.
   */
  @Post('expenses')
  @ApiOperation({
    summary: 'Record vendor expense (Admin)',
    description: 'Records operational expense in SAR/USD with currency conversion rate stored.',
  })
  @ApiResponse({ status: 201, description: 'Vendor expense logged successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Vendor not found.' })
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
  @ApiOperation({
    summary: 'List all vendor expenses (Admin)',
    description: 'Retrieves expense ledger records with vendor, package, and currency filters.',
  })
  @ApiQuery({ name: 'vendor_id', required: false, description: 'Filter by vendor UUID' })
  @ApiQuery({ name: 'package_id', required: false, description: 'Filter by package UUID' })
  @ApiQuery({ name: 'currency', required: false, description: 'Filter by currency code' })
  @ApiResponse({ status: 200, description: 'Expense records returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
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
  @ApiOperation({
    summary: 'Get vendor details by ID (Admin)',
    description: 'Retrieves vendor profile and expense audit history.',
  })
  @ApiParam({ name: 'id', description: 'Vendor UUID', type: String })
  @ApiResponse({ status: 200, description: 'Vendor profile returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Vendor not found.' })
  async getVendorById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorsService.findVendorById(id);
  }
}
