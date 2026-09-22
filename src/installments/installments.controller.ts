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
import { InstallmentsService } from './installments.service.js';

@Controller('bookings/:bookingId/installments')
@UseGuards(JwtAuthGuard)
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  /**
   * GET /bookings/:bookingId/installments
   * Returns installment schedule for a booking with ownership validation.
   */
  @Get()
  async getInstallments(
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.installmentsService.findByBooking(bookingId, currentUser);
  }
}
