import {
  Body,
  Controller,
  Get,
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
import { CancellationsService } from './cancellations.service.js';
import { RequestCancellationDto } from './dto/request-cancellation.dto.js';

@Controller('cancellations')
@UseGuards(JwtAuthGuard)
export class CancellationsController {
  constructor(
    private readonly cancellationsService: CancellationsService,
  ) {}

  /**
   * POST /cancellations/request
   * Requests a booking cancellation or individual pilgrim cancellation.
   */
  @Post('request')
  async requestCancellation(
    @Body() dto: RequestCancellationDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.cancellationsService.requestCancellation(dto, currentUser);
  }

  /**
   * POST /cancellations/:id/approve
   * Admin approves a cancellation request, releasing seats and approving refund.
   */
  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async approveCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentAdmin: User,
  ) {
    return this.cancellationsService.approveCancellation(id, currentAdmin);
  }

  /**
   * POST /cancellations/:id/reject
   * Admin rejects a cancellation request.
   */
  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async rejectCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() currentAdmin: User,
  ) {
    return this.cancellationsService.rejectCancellation(id, currentAdmin, reason);
  }

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
