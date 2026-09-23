import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { UserRole } from '../users/enums/user-role.enum.js';
import { AuditService } from './audit.service.js';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT-auth')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /audit-logs
   * Retrieves all audit logs with optional filters.
   */
  @Get()
  @ApiOperation({
    summary: 'List all audit mutation logs (Admin)',
    description: 'Retrieves chronological mutation audit records with actor, entity type, and action filters.',
  })
  @ApiQuery({ name: 'actor_id', required: false, description: 'Filter by actor user UUID' })
  @ApiQuery({ name: 'entity_type', required: false, description: 'Filter by entity type (e.g. Booking, Payment, VendorExpense)' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action name (e.g. CREATE, UPDATE, APPROVE)' })
  @ApiResponse({ status: 200, description: 'Audit log records returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getAllLogs(
    @Query('actor_id') actorId?: string,
    @Query('entity_type') entityType?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.findAll(actorId, entityType, action);
  }

  /**
   * GET /audit-logs/:id
   * Retrieves single audit log record by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get audit log details by ID (Admin)',
    description: 'Retrieves single audit record containing oldValue and newValue state diffs.',
  })
  @ApiParam({ name: 'id', description: 'Audit log UUID', type: String })
  @ApiResponse({ status: 200, description: 'Audit log details returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Audit log not found.' })
  async getLogById(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditService.findById(id);
  }

  /**
   * GET /audit-logs/entity/:type/:id
   * Retrieves audit history for a specific entity.
   */
  @Get('entity/:type/:id')
  @ApiOperation({
    summary: 'Get entity audit trail (Admin)',
    description: 'Retrieves full change and audit timeline for a specific entity type and ID.',
  })
  @ApiParam({ name: 'type', description: 'Entity classification (e.g. Booking, Payment, Refund)', type: String })
  @ApiParam({ name: 'id', description: 'Entity UUID', type: String })
  @ApiResponse({ status: 200, description: 'Entity audit trail returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getEntityLogs(
    @Param('type') entityType: string,
    @Param('id', ParseUUIDPipe) entityId: string,
  ) {
    return this.auditService.findByEntity(entityType, entityId);
  }
}
