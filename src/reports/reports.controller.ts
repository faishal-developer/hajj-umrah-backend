import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { ReportsService } from './reports.service.js';
import { RefundStatus } from '../cancellations/enums/refund-status.enum.js';

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
  async getBookingsSummary(@Query('package_id') packageId?: string) {
    return this.reportsService.getBookingsSummary(packageId);
  }

  /**
   * GET /reports/collections
   * Detailed breakdown of revenue collected across providers and payment methods.
   */
  @Get('collections')
  async getCollectionsReport(@Query('provider') provider?: string) {
    return this.reportsService.getCollectionsReport(provider);
  }

  /**
   * GET /reports/outstanding-installments
   * Overview of pending, partial, and overdue installment balances.
   */
  @Get('outstanding-installments')
  async getOutstandingInstallmentsReport() {
    return this.reportsService.getOutstandingInstallmentsReport();
  }

  /**
   * GET /reports/refunds
   * Breakdown of refund requests, approvals, completions, and amounts.
   */
  @Get('refunds')
  async getRefundsReport(@Query('status') status?: RefundStatus) {
    return this.reportsService.getRefundsReport(status);
  }

  /**
   * GET /reports/seats
   * Quota, held, confirmed, available seats, and occupancy rates.
   */
  @Get('seats')
  async getSeatsReport(@Query('package_id') packageId?: string) {
    return this.reportsService.getSeatsReport(packageId);
  }
}
