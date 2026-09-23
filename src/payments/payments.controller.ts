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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments/initiate
   * Starts an online payment intent for a booking.
   */
  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Initiate an online payment session',
    description: 'Initializes a pending payment with an online gateway (e.g. SSLCommerz, bKash).',
  })
  @ApiResponse({ status: 201, description: 'Payment session created and gateway redirect URL generated.' })
  @ApiResponse({ status: 400, description: 'Invalid payment amount or booking not eligible for payment.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
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
  @ApiOperation({
    summary: 'Handle gateway webhook notification',
    description: 'Server-to-server webhook endpoint verifying HMAC signatures, deduplicating event IDs, and transitioning payment/booking state.',
  })
  @ApiParam({ name: 'provider', description: 'Payment provider identifier (e.g. sslcommerz, bkash)', type: String })
  @ApiResponse({ status: 200, description: 'Webhook acknowledged and processed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload or signature mismatch.' })
  @ApiResponse({ status: 409, description: 'Conflicting event state transition.' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Record manual bank or cash payment',
    description: 'Records a branch payment in PENDING status requiring Maker-Checker administrative approval.',
  })
  @ApiResponse({ status: 201, description: 'Manual payment recorded in pending state.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Approve manual payment (Maker-Checker)',
    description: 'Approves manual payment, allocates funds to oldest unpaid installments, and logs audit record. Strict rule: recorded_by != approved_by.',
  })
  @ApiParam({ name: 'id', description: 'Payment UUID', type: String })
  @ApiResponse({ status: 200, description: 'Payment approved successfully.' })
  @ApiResponse({ status: 400, description: 'Payment already processed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Maker cannot approve their own recorded payment.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reject manual payment',
    description: 'Rejects a pending manual payment record with reasons logged.',
  })
  @ApiParam({ name: 'id', description: 'Payment UUID', type: String })
  @ApiBody({ schema: { properties: { reason: { type: 'string', example: 'Bank receipt unverified' } } } })
  @ApiResponse({ status: 200, description: 'Payment rejected.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all payments for current user',
    description: 'Retrieves payment history across all bookings owned by current user.',
  })
  @ApiResponse({ status: 200, description: 'Payment history returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyPayments(@CurrentUser() currentUser: User) {
    return this.paymentsService.findForUser(currentUser.id);
  }

  /**
   * GET /payments
   * List endpoint deriving data strictly from the authenticated identity.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List user payments',
    description: 'Retrieves payments for authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Payment records returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getPayments(@CurrentUser() currentUser: User) {
    return this.paymentsService.findForUser(currentUser.id);
  }

  /**
   * GET /payments/booking/:bookingId
   * Returns payments for a booking after validating ownership.
   */
  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get payments for a specific booking',
    description: 'Retrieves all payment transactions associated with a booking with ownership enforcement.',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID', type: String })
  @ApiResponse({ status: 200, description: 'Booking payments returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get payment details by ID',
    description: 'Retrieves detailed payment transaction and installment allocation breakdown.',
  })
  @ApiParam({ name: 'id', description: 'Payment UUID', type: String })
  @ApiResponse({ status: 200, description: 'Payment details returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  async getPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.paymentsService.findByIdAndValidateOwnership(id, currentUser);
  }
}
