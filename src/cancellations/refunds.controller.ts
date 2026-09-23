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
import { ProcessRefundDto } from './dto/process-refund.dto.js';

@ApiTags('Refunds')
@ApiBearerAuth('JWT-auth')
@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundsController {
  constructor(
    private readonly cancellationsService: CancellationsService,
  ) {}

  /**
   * POST /refunds/:id/process
   * Admin processes/updates a refund through its lifecycle (APPROVED -> PROCESSING -> COMPLETED or REJECTED).
   */
  @Post(':id/process')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Process refund lifecycle (Admin)',
    description: 'Updates approved refund state (PROCESSING, COMPLETED, REJECTED) with bank/gateway reference and audit logging.',
  })
  @ApiParam({ name: 'id', description: 'Refund UUID', type: String })
  @ApiResponse({ status: 200, description: 'Refund updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request or invalid status transition.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Refund record not found.' })
  async processRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessRefundDto,
    @CurrentUser() currentAdmin: User,
  ) {
    return this.cancellationsService.processRefund(id, dto, currentAdmin);
  }

  /**
   * GET /refunds/me
   * Returns all refunds for bookings owned by authenticated user.
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get all refunds for current user',
    description: 'Retrieves refund history across all user bookings.',
  })
  @ApiResponse({ status: 200, description: 'User refunds returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyRefunds(@CurrentUser() currentUser: User) {
    return this.cancellationsService.findRefundsForUser(currentUser.id);
  }

  /**
   * GET /refunds
   * List endpoint deriving data strictly from the authenticated identity.
   */
  @Get()
  @ApiOperation({
    summary: 'List user refunds',
    description: 'Retrieves refunds for authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Refunds list returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getRefunds(@CurrentUser() currentUser: User) {
    return this.cancellationsService.findRefundsForUser(currentUser.id);
  }

  /**
   * GET /refunds/:id
   * Returns refund details after validating ownership.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get refund details by ID',
    description: 'Retrieves refund record and transaction disbursement reference with ownership validation.',
  })
  @ApiParam({ name: 'id', description: 'Refund UUID', type: String })
  @ApiResponse({ status: 200, description: 'Refund details returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Refund not found.' })
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
