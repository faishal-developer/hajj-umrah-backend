import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogsRepository: any;

  beforeEach(async () => {
    auditLogsRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: auditLogsRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all audit logs with filters applied', async () => {
      const mockLogs = [
        { id: '1', actorId: 'user-1', entityType: 'Booking', action: 'UPDATE' },
      ];
      auditLogsRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findAll('user-1', 'Booking', 'UPDATE');

      expect(auditLogsRepository.find).toHaveBeenCalledWith({
        where: {
          actorId: 'user-1',
          entityType: 'Booking',
          action: 'UPDATE',
        },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findById', () => {
    it('should return log if found', async () => {
      const mockLog = { id: 'log-1', action: 'CREATE' };
      auditLogsRepository.findOne.mockResolvedValue(mockLog);

      const result = await service.findById('log-1');
      expect(result).toEqual(mockLog);
    });

    it('should throw NotFoundException if not found', async () => {
      auditLogsRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEntity', () => {
    it('should return audit logs for specific entity', async () => {
      const mockLogs = [{ id: '1', entityType: 'Payment', entityId: 'pay-1' }];
      auditLogsRepository.find.mockResolvedValue(mockLogs);

      const result = await service.findByEntity('Payment', 'pay-1');
      expect(auditLogsRepository.find).toHaveBeenCalledWith({
        where: { entityType: 'Payment', entityId: 'pay-1' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockLogs);
    });
  });

  describe('logMutation', () => {
    it('should create and save an audit log record', async () => {
      const logData = {
        actorId: 'admin-1',
        action: 'UPDATE',
        entityType: 'Booking',
        entityId: 'book-1',
        oldValue: { status: 'HELD' },
        newValue: { status: 'CONFIRMED' },
      };

      auditLogsRepository.create.mockReturnValue(logData);
      auditLogsRepository.save.mockResolvedValue({ id: 'log-uuid', ...logData });

      const result = await service.logMutation(
        'admin-1',
        'UPDATE',
        'Booking',
        'book-1',
        { status: 'HELD' },
        { status: 'CONFIRMED' },
      );

      expect(auditLogsRepository.create).toHaveBeenCalledWith(logData);
      expect(auditLogsRepository.save).toHaveBeenCalledWith(logData);
      expect(result).toEqual({ id: 'log-uuid', ...logData });
    });
  });
});
