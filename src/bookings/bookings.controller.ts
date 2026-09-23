import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { CancelBookingDto } from './dto/cancel-booking.dto.js';
import { CancelPilgrimDto } from './dto/cancel-pilgrim.dto.js';

@ApiTags('Bookings')
@ApiBearerAuth('JWT-auth')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * POST /bookings
   * Creates a new group booking with immutable price snapshotting and idempotency support.
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new booking',
    description:
      'Creates a new booking holding seats with pessimistic locking, creates immutable price snapshots, and supports idempotency via Idempotency-Key header.',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Unique client request token for idempotent request processing',
  })
  @ApiResponse({ status: 201, description: 'Booking created successfully with held seat reservations.' })
  @ApiResponse({ status: 400, description: 'Invalid booking data or insufficient tier quota.' })
  @ApiResponse({ status: 401, description: 'Unauthorized access.' })
  @ApiResponse({ status: 409, description: 'Seat allocation conflict.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async createBooking(
    @CurrentUser() currentUser: User,
    @Body() createDto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.bookingsService.createBooking(
      currentUser.id,
      createDto,
      idempotencyKey,
    );
  }

  /**
   * GET /bookings/me
   * Returns bookings strictly for the authenticated user.
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get current user bookings',
    description: 'Retrieves all bookings belonging to the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'List of user bookings retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized access.' })
  async getMyBookings(@CurrentUser() currentUser: User) {
    return this.bookingsService.findForUser(currentUser.id);
  }

  /**
   * GET /bookings
   * Default list endpoint deriving identity from authenticated user.
   */
  @Get()
  @ApiOperation({
    summary: 'List user bookings',
    description: 'Retrieves bookings for authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'List of user bookings.' })
  @ApiResponse({ status: 401, description: 'Unauthorized access.' })
  async getBookings(@CurrentUser() currentUser: User) {
    return this.bookingsService.findForUser(currentUser.id);
  }

  /**
   * GET /bookings/:id
   * Returns a booking if the authenticated user is the owner, or if ADMIN.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get booking details by ID',
    description: 'Retrieves booking by ID with ownership verification.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the booking', type: String })
  @ApiResponse({ status: 200, description: 'Booking details retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized access.' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own this booking.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  async getBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.bookingsService.findByIdAndValidateOwnership(id, currentUser);
  }

  /**
   * POST /bookings/:id/cancel
   * Cancels an entire booking.
   */
  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an entire booking',
    description: 'Cancels the booking and releases all associated held seat reservations.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the booking to cancel', type: String })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully.' })
  @ApiResponse({ status: 400, description: 'Booking cannot be cancelled in current status.' })
  @ApiResponse({ status: 401, description: 'Unauthorized access.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
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

  /**
   * POST /bookings/:bookingId/pilgrims/:pilgrimId/cancel
   * Cancels an individual pilgrim (partial group cancellation).
   */
  @Post(':bookingId/pilgrims/:pilgrimId/cancel')
  @ApiOperation({
    summary: 'Cancel an individual pilgrim in a booking',
    description: 'Cancels an individual pilgrim from a group booking and decrements the seat count.',
  })
  @ApiParam({ name: 'bookingId', description: 'UUID of the parent booking', type: String })
  @ApiParam({ name: 'pilgrimId', description: 'UUID of the individual pilgrim to cancel', type: String })
  @ApiResponse({ status: 200, description: 'Individual pilgrim cancelled successfully.' })
  @ApiResponse({ status: 400, description: 'Cannot cancel pilgrim in current state.' })
  @ApiResponse({ status: 401, description: 'Unauthorized access.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Booking or pilgrim not found.' })
  async cancelPilgrim(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('pilgrimId', ParseUUIDPipe) pilgrimId: string,
    @CurrentUser() currentUser: User,
    @Body() _cancelDto?: CancelPilgrimDto,
  ) {
    return this.bookingsService.cancelPilgrim(
      bookingId,
      pilgrimId,
      currentUser,
    );
  }
}
