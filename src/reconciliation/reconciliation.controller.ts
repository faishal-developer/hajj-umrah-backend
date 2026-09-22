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
  async getDiscrepancies(@Query('provider') provider?: string) {
    return this.reconciliationService.findDiscrepancies(provider);
  }

  /**
   * GET /reconciliation
   * Returns all reconciliation records with optional filters.
   */
  @Get()
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
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliationService.findById(id);
  }

  /**
   * PATCH /reconciliation/:id/status
   * Updates reconciliation status (UNDER_REVIEW or RESOLVED) with notes.
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReconciliationDto,
    @CurrentUser() currentAdmin: User,
  ) {
    return this.reconciliationService.updateStatus(id, dto, currentAdmin);
  }
}
