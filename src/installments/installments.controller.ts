import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { InstallmentsService } from './installments.service.js';

@ApiTags('Installments')
@ApiBearerAuth('JWT-auth')
@Controller('bookings/:bookingId/installments')
@UseGuards(JwtAuthGuard)
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  /**
   * GET /bookings/:bookingId/installments
   * Returns installment schedule for a booking with ownership validation.
   */
  @Get()
  @ApiOperation({
    summary: 'Get installment payment schedule',
    description: 'Retrieves all generated installments and payment allocations for a given booking.',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking UUID', type: String })
  @ApiResponse({ status: 200, description: 'Installment schedule retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - User does not own this booking.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  async getInstallments(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.installmentsService.findByBooking(bookingId, currentUser);
  }
}
