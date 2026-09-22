import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { AuditService } from './audit.service.js';

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
  async getLogById(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditService.findById(id);
  }

  /**
   * GET /audit-logs/entity/:type/:id
   * Retrieves audit history for a specific entity.
   */
  @Get('entity/:type/:id')
  async getEntityLogs(
    @Param('type') entityType: string,
    @Param('id', ParseUUIDPipe) entityId: string,
  ) {
    return this.auditService.findByEntity(entityType, entityId);
  }
}
