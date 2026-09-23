import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { ReportsService } from './reports.service.js';
import { RefundStatus } from '../cancellations/enums/refund-status.enum.js';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /reports/bookings
   * Aggregates booking status counts, total pilgrims, and gross booked value.
   */
  @Get('bookings')
  @ApiOperation({
    summary: 'Get bookings executive summary report (Admin)',
    description: 'Aggregates booking metrics grouped by status (HELD, CONFIRMED, CANCELLED), total pilgrims count, and active gross booked value.',
  })
  @ApiQuery({ name: 'package_id', required: false, description: 'Filter bookings summary by package UUID' })
  @ApiResponse({ status: 200, description: 'Bookings summary metrics returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getBookingsSummary(@Query('package_id') packageId?: string) {
    return this.reportsService.getBookingsSummary(packageId);
  }

  /**
   * GET /reports/collections
   * Detailed breakdown of revenue collected across providers and payment methods.
   */
  @Get('collections')
  @ApiOperation({
    summary: 'Get collections and revenue report (Admin)',
    description: 'Detailed revenue breakdown comparing gateway collections vs manual collections across payment providers and methods.',
  })
  @ApiQuery({ name: 'provider', required: false, description: 'Filter by provider name (e.g. SSLCOMMERZ, BKASH, MANUAL)' })
  @ApiResponse({ status: 200, description: 'Collections metrics returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getCollectionsReport(@Query('provider') provider?: string) {
    return this.reportsService.getCollectionsReport(provider);
  }

  /**
   * GET /reports/outstanding-installments
   * Overview of pending, partial, and overdue installment balances.
   */
  @Get('outstanding-installments')
  @ApiOperation({
    summary: 'Get outstanding and overdue installments report (Admin)',
    description: 'Aggregates all unpaid, partial, and overdue installment balances to monitor credit default exposure.',
  })
  @ApiResponse({ status: 200, description: 'Outstanding installments metrics returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getOutstandingInstallmentsReport() {
    return this.reportsService.getOutstandingInstallmentsReport();
  }

  /**
   * GET /reports/refunds
   * Breakdown of refund requests, approvals, completions, and amounts.
   */
  @Get('refunds')
  @ApiOperation({
    summary: 'Get refunds and disbursements report (Admin)',
    description: 'Aggregates refund amounts requested, approved, and completed.',
  })
  @ApiQuery({ name: 'status', required: false, enum: RefundStatus, description: 'Filter by refund status' })
  @ApiResponse({ status: 200, description: 'Refunds report metrics returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getRefundsReport(@Query('status') status?: RefundStatus) {
    return this.reportsService.getRefundsReport(status);
  }

  /**
   * GET /reports/seats
   * Quota, held, confirmed, available seats, and occupancy rates.
   */
  @Get('seats')
  @ApiOperation({
    summary: 'Get seat quota and occupancy report (Admin)',
    description: 'Calculates total system quota, held seats, confirmed seats, available seats, and percentage occupancy rates.',
  })
  @ApiQuery({ name: 'package_id', required: false, description: 'Filter seats report by package UUID' })
  @ApiResponse({ status: 200, description: 'Seat occupancy metrics returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getSeatsReport(@Query('package_id') packageId?: string) {
    return this.reportsService.getSeatsReport(packageId);
  }
}
