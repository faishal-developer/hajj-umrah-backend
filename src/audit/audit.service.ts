import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../common/entities/audit-log.entity.js';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
  ) {}

  /**
   * Retrieves all audit logs with optional filters.
   */
  async findAll(
    actorId?: string,
    entityType?: string,
    action?: string,
  ): Promise<AuditLog[]> {
    const where: any = {};
    if (actorId) where.actorId = actorId;
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    return this.auditLogsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves a single audit log record by ID.
   */
  async findById(id: string): Promise<AuditLog> {
    const log = await this.auditLogsRepository.findOne({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException(`Audit log record with ID "${id}" not found`);
    }

    return log;
  }

  /**
   * Retrieves audit logs for a specific entity.
   */
  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogsRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Utility helper to record an audit log entry for mutations.
   */
  async logMutation(
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    oldValue: Record<string, any> | null = null,
    newValue: Record<string, any> | null = null,
  ): Promise<AuditLog> {
    const log = this.auditLogsRepository.create({
      actorId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
    });

    return this.auditLogsRepository.save(log);
  }
}
