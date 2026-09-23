import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { ReconciliationService } from './reconciliation.service.js';
import { ReconcileBatchDto } from './dto/reconcile-batch.dto.js';
import { ResolveReconciliationDto } from './dto/resolve-reconciliation.dto.js';
import { ReconciliationStatus } from './enums/reconciliation-status.enum.js';

@ApiTags('Reconciliation')
@ApiBearerAuth('JWT-auth')
@Controller('reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ReconciliationController {
  constructor(
    private readonly reconciliationService: ReconciliationService,
  ) {}

  /**
   * POST /reconciliation/batch
   * Reconciles a batch of gateway/bank settlements against internal records.
   */
  @Post('batch')
  @ApiOperation({
    summary: 'Reconcile gateway settlement batch (Admin)',
    description: 'Compares bank/gateway settlement records against internal payments, detecting exact matches or mismatches with zero silent mutations.',
  })
  @ApiResponse({ status: 201, description: 'Batch reconciled and reconciliation records stored.' })
  @ApiResponse({ status: 400, description: 'Bad request or empty batch.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async reconcileBatch(
    @Body() dto: ReconcileBatchDto,
    @CurrentUser() currentAdmin: User,
  ) {
    return this.reconciliationService.reconcileBatch(dto, currentAdmin);
  }

  /**
   * GET /reconciliation/discrepancies
   * Returns all unresolved mismatches and items under review.
   */
  @Get('discrepancies')
  @ApiOperation({
    summary: 'Get unresolved payment discrepancies (Admin)',
    description: 'Retrieves all records with status MISMATCH or UNDER_REVIEW.',
  })
  @ApiQuery({ name: 'provider', required: false, description: 'Filter by provider name' })
  @ApiResponse({ status: 200, description: 'List of discrepancies returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getDiscrepancies(@Query('provider') provider?: string) {
    return this.reconciliationService.findDiscrepancies(provider);
  }

  /**
   * GET /reconciliation
   * Returns all reconciliation records with optional filters.
   */
  @Get()
  @ApiOperation({
    summary: 'List all reconciliation records (Admin)',
    description: 'Retrieves history of all settlement reconciliations with provider/status filters.',
  })
  @ApiQuery({ name: 'provider', required: false, description: 'Filter by provider' })
  @ApiQuery({ name: 'status', required: false, enum: ReconciliationStatus, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'Reconciliation records returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getAll(
    @Query('provider') provider?: string,
    @Query('status') status?: ReconciliationStatus,
  ) {
    return this.reconciliationService.findAll(provider, status);
  }

  /**
   * GET /reconciliation/:id
   * Returns single reconciliation record.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get reconciliation record by ID (Admin)',
    description: 'Retrieves single reconciliation record with internal payment link.',
  })
  @ApiParam({ name: 'id', description: 'Reconciliation UUID', type: String })
  @ApiResponse({ status: 200, description: 'Record returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Record not found.' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliationService.findById(id);
  }

  /**
   * PATCH /reconciliation/:id/status
   * Updates reconciliation status (UNDER_REVIEW or RESOLVED) with notes.
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update reconciliation dispute status (Admin)',
    description: 'Marks discrepancy as UNDER_REVIEW or RESOLVED with mandatory justification notes and audit logging.',
  })
  @ApiParam({ name: 'id', description: 'Reconciliation UUID', type: String })
  @ApiResponse({ status: 200, description: 'Status updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid status transition.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Record not found.' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReconciliationDto,
    @CurrentUser() currentAdmin: User,
  ) {
    return this.reconciliationService.updateStatus(id, dto, currentAdmin);
  }
}
