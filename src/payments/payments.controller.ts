import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { PaymentsService } from './payments.service.js';
import { InitiatePaymentDto } from './dto/initiate-payment.dto.js';
import { GatewayWebhookDto } from './dto/gateway-webhook.dto.js';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments/initiate
   * Starts an online payment intent for a booking.
   */
  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.paymentsService.initiateGatewayPayment(dto, currentUser);
  }

  /**
   * POST /payments/webhook/:provider
   * Gateway webhook callback for verified server-to-server transaction status notifications.
   */
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() dto: GatewayWebhookDto,
  ) {
    return this.paymentsService.processGatewayWebhook(provider, dto);
  }

  /**
   * POST /payments/manual
   * Records a manual / branch payment request.
   */
  @Post('manual')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AGENT)
  async recordManualPayment(
    @Body() dto: RecordManualPaymentDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.paymentsService.recordManualPayment(dto, currentUser);
  }

  /**
   * POST /payments/:id/approve
   * Admin approves manual payment with Maker-Checker verification (recorded_by != approved_by).
   */
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async approvePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentAdmin: User,
  ) {
    return this.paymentsService.approveManualPayment(id, currentAdmin);
  }

  /**
   * POST /payments/:id/reject
   * Admin rejects manual payment with Maker-Checker verification.
   */
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async rejectPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() currentAdmin: User,
  ) {
    return this.paymentsService.rejectManualPayment(id, currentAdmin, reason);
  }

  /**
   * GET /payments/me
   * Returns payments for all bookings owned by the authenticated user.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyPayments(@CurrentUser() currentUser: User) {
    return this.paymentsService.findForUser(currentUser.id);
  }

  /**
   * GET /payments
   * List endpoint deriving data strictly from the authenticated identity.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getPayments(@CurrentUser() currentUser: User) {
    return this.paymentsService.findForUser(currentUser.id);
  }

  /**
   * GET /payments/booking/:bookingId
   * Returns payments for a booking after validating ownership.
   */
  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  async getPaymentsByBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.paymentsService.findByBookingAndValidateOwnership(
      bookingId,
      currentUser,
    );
  }

  /**
   * GET /payments/:id
   * Returns payment details after validating ownership.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.paymentsService.findByIdAndValidateOwnership(id, currentUser);
  }
}
