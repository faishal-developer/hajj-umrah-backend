import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: any;

  beforeEach(async () => {
    auditService = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEntity: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditController>(AuditController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAllLogs should call service.findAll', async () => {
    const mockLogs = [{ id: '1' }];
    auditService.findAll.mockResolvedValue(mockLogs);

    const result = await controller.getAllLogs('actor-1', 'Booking', 'CREATE');
    expect(auditService.findAll).toHaveBeenCalledWith('actor-1', 'Booking', 'CREATE');
    expect(result).toEqual(mockLogs);
  });

  it('getLogById should call service.findById', async () => {
    const mockLog = { id: 'log-1' };
    auditService.findById.mockResolvedValue(mockLog);

    const result = await controller.getLogById('log-1');
    expect(auditService.findById).toHaveBeenCalledWith('log-1');
    expect(result).toEqual(mockLog);
  });

  it('getEntityLogs should call service.findByEntity', async () => {
    const mockLogs = [{ id: '1' }];
    auditService.findByEntity.mockResolvedValue(mockLogs);

    const result = await controller.getEntityLogs('Payment', 'pay-1');
    expect(auditService.findByEntity).toHaveBeenCalledWith('Payment', 'pay-1');
    expect(result).toEqual(mockLogs);
  });
});
