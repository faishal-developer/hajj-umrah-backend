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
import { CancellationsService } from './cancellations.service.js';

@Controller('cancellations')
@UseGuards(JwtAuthGuard)
export class CancellationsController {
  constructor(
    private readonly cancellationsService: CancellationsService,
  ) {}

  /**
   * GET /cancellations/me
   * Returns all cancellations for bookings owned by authenticated user.
   */
  @Get('me')
  async getMyCancellations(@CurrentUser() currentUser: User) {
    return this.cancellationsService.findForUser(currentUser.id);
  }

  /**
   * GET /cancellations
   * List endpoint deriving data strictly from the authenticated identity.
   */
  @Get()
  async getCancellations(@CurrentUser() currentUser: User) {
    return this.cancellationsService.findForUser(currentUser.id);
  }

  /**
   * GET /cancellations/booking/:bookingId
   * Returns cancellations for a booking after validating ownership.
   */
  @Get('booking/:bookingId')
  async getCancellationsByBooking(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.cancellationsService.findByBookingAndValidateOwnership(
      bookingId,
      currentUser,
    );
  }

  /**
   * GET /cancellations/:id
   * Returns cancellation details after validating ownership.
   */
  @Get(':id')
  async getCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.cancellationsService.findByIdAndValidateOwnership(
      id,
      currentUser,
    );
  }
}
