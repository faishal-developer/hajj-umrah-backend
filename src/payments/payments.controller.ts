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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
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
   * Public endpoint (verified via gateway signatures / secret payload).
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
  @UseGuards(JwtAuthGuard)
  async recordManualPayment(
    @Body() dto: RecordManualPaymentDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.paymentsService.recordManualPayment(dto, currentUser);
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
