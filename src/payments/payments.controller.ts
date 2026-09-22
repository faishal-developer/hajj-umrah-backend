import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * GET /payments/me
   * Returns payments for all bookings owned by the authenticated user.
   */
  @Get('me')
  async getMyPayments(@CurrentUser() currentUser: User) {
    return this.paymentsService.findForUser(currentUser.id);
  }

  /**
   * GET /payments
   * List endpoint deriving data strictly from the authenticated identity.
   */
  @Get()
  async getPayments(@CurrentUser() currentUser: User) {
    return this.paymentsService.findForUser(currentUser.id);
  }

  /**
   * GET /payments/booking/:bookingId
   * Returns payments for a booking after validating ownership.
   */
  @Get('booking/:bookingId')
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
  async getPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.paymentsService.findByIdAndValidateOwnership(id, currentUser);
  }
}
