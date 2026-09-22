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

@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundsController {
  constructor(
    private readonly cancellationsService: CancellationsService,
  ) {}

  /**
   * GET /refunds/me
   * Returns all refunds for bookings owned by authenticated user.
   */
  @Get('me')
  async getMyRefunds(@CurrentUser() currentUser: User) {
    return this.cancellationsService.findRefundsForUser(currentUser.id);
  }

  /**
   * GET /refunds
   * List endpoint deriving data strictly from the authenticated identity.
   */
  @Get()
  async getRefunds(@CurrentUser() currentUser: User) {
    return this.cancellationsService.findRefundsForUser(currentUser.id);
  }

  /**
   * GET /refunds/:id
   * Returns refund details after validating ownership.
   */
  @Get(':id')
  async getRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.cancellationsService.findRefundByIdAndValidateOwnership(
      id,
      currentUser,
    );
  }
}
