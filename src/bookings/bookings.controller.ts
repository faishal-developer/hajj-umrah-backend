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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { BookingsService } from './bookings.service.js';
import { CancelBookingDto } from './dto/cancel-booking.dto.js';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * GET /bookings/me
   * Returns bookings strictly for the authenticated user.
   */
  @Get('me')
  async getMyBookings(@CurrentUser() currentUser: User) {
    return this.bookingsService.findForUser(currentUser.id);
  }

  /**
   * GET /bookings
   * Default list endpoint deriving identity from authenticated user.
   */
  @Get()
  async getBookings(@CurrentUser() currentUser: User) {
    return this.bookingsService.findForUser(currentUser.id);
  }

  /**
   * GET /bookings/:id
   * Returns a booking if the authenticated user is the owner, or if ADMIN.
   */
  @Get(':id')
  async getBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.bookingsService.findByIdAndValidateOwnership(id, currentUser);
  }

  /**
   * POST /bookings/:id/cancel
   * Cancels a booking if the authenticated user is the owner, or if ADMIN.
   */
  @Post(':id/cancel')
  async cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
    @Body() cancelDto: CancelBookingDto,
  ) {
    return this.bookingsService.cancelBooking(
      id,
      currentUser,
      cancelDto?.reason,
    );
  }
}
