import {
  Body,
  Controller,
  Get,
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
import { CancellationsService } from './cancellations.service.js';
import { RequestCancellationDto } from './dto/request-cancellation.dto.js';

@ApiTags('Cancellations')
@ApiBearerAuth('JWT-auth')
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
  @ApiOperation({
    summary: 'Request booking or pilgrim cancellation',
    description: 'Creates a cancellation request and computes eligible refund subject to refund <= received payment constraint.',
  })
  @ApiResponse({ status: 201, description: 'Cancellation request submitted in REQUESTED state.' })
  @ApiResponse({ status: 400, description: 'Invalid request or booking already cancelled.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
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
  @ApiOperation({
    summary: 'Approve cancellation request (Admin)',
    description: 'Approves cancellation, releases seat quota back to available pool, transitions refund to APPROVED, and writes audit record.',
  })
  @ApiParam({ name: 'id', description: 'Cancellation UUID', type: String })
  @ApiResponse({ status: 200, description: 'Cancellation approved.' })
  @ApiResponse({ status: 400, description: 'Cancellation not in REQUESTED status.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Cancellation record not found.' })
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
  @ApiOperation({
    summary: 'Reject cancellation request (Admin)',
    description: 'Rejects cancellation and keeps booking/pilgrims active.',
  })
  @ApiParam({ name: 'id', description: 'Cancellation UUID', type: String })
  @ApiBody({ schema: { properties: { reason: { type: 'string', example: 'Cancellation window closed' } } } })
  @ApiResponse({ status: 200, description: 'Cancellation rejected.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Cancellation record not found.' })
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
  @ApiOperation({
    summary: 'Get all cancellations for current user',
    description: 'Retrieves cancellation request history for the logged-in user.',
  })
  @ApiResponse({ status: 200, description: 'User cancellations returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyCancellations(@CurrentUser() currentUser: User) {
    return this.cancellationsService.findForUser(currentUser.id);
  }

  /**
   * GET /cancellations
   * List endpoint deriving data strictly from the authenticated identity.
   */
  @Get()
  @ApiOperation({
    summary: 'List user cancellations',
    description: 'Retrieves cancellations for authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Cancellations list returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getCancellations(@CurrentUser() currentUser: User) {
    return this.cancellationsService.findForUser(currentUser.id);
  }

  /**
   * GET /cancellations/booking/:bookingId
   * Returns cancellations for a booking after validating ownership.
   */
  @Get('booking/:bookingId')
  @ApiOperation({
    summary: 'Get cancellations for a specific booking',
    description: 'Retrieves all cancellation records associated with a booking.',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID', type: String })
  @ApiResponse({ status: 200, description: 'Booking cancellations returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
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
  @ApiOperation({
    summary: 'Get cancellation details by ID',
    description: 'Retrieves cancellation details with refund calculation and pilgrim snapshots.',
  })
  @ApiParam({ name: 'id', description: 'Cancellation UUID', type: String })
  @ApiResponse({ status: 200, description: 'Cancellation details returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Cancellation not found.' })
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
