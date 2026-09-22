import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminPackagesController } from './admin-packages.controller.js';
import { PackagesService } from './packages.service.js';
import { TiersService } from './tiers.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

describe('AdminPackagesController', () => {
  let controller: AdminPackagesController;
  let packagesService: PackagesService;
  let tiersService: TiersService;

  const mockPackagesService = {
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'pkg-1' }),
    findById: vi.fn().mockResolvedValue({ id: 'pkg-1' }),
    update: vi.fn().mockResolvedValue({ id: 'pkg-1', name: 'Updated' }),
    publish: vi.fn().mockResolvedValue({ id: 'pkg-1', status: 'PUBLISHED' }),
    archive: vi.fn().mockResolvedValue({ id: 'pkg-1', status: 'ARCHIVED' }),
  };

  const mockTiersService = {
    create: vi.fn().mockResolvedValue({ id: 'tier-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPackagesController],
      providers: [
        { provide: PackagesService, useValue: mockPackagesService },
        { provide: TiersService, useValue: mockTiersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminPackagesController>(AdminPackagesController);
    packagesService = module.get<PackagesService>(PackagesService);
    tiersService = module.get<TiersService>(TiersService);
  });

  it('createPackage should call packagesService.create', async () => {
    const dto = {
      name: 'Umrah',
      type: 'RAMADAN_UMRAH',
      departure_date: '2027-03-15',
      booking_start_date: '2026-10-01',
      booking_end_date: '2027-02-01',
    };
    const result = await controller.createPackage(dto);
    expect(packagesService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'pkg-1' });
  });

  it('updatePackage should call packagesService.update with version', async () => {
    const dto = { name: 'Updated', version: 1 };
    const result = await controller.updatePackage('pkg-1', dto);
    expect(packagesService.update).toHaveBeenCalledWith('pkg-1', dto);
    expect(result).toEqual({ id: 'pkg-1', name: 'Updated' });
  });

  it('publishPackage should call packagesService.publish', async () => {
    const result = await controller.publishPackage('pkg-1');
    expect(packagesService.publish).toHaveBeenCalledWith('pkg-1');
    expect(result.status).toBe('PUBLISHED');
  });

  it('archivePackage should call packagesService.archive', async () => {
    const result = await controller.archivePackage('pkg-1');
    expect(packagesService.archive).toHaveBeenCalledWith('pkg-1');
    expect(result.status).toBe('ARCHIVED');
  });

  it('createTier should call tiersService.create', async () => {
    const dto = { name: 'VIP', price: 300000, quota: 20 };
    const result = await controller.createTier('pkg-1', dto);
    expect(tiersService.create).toHaveBeenCalledWith('pkg-1', dto);
    expect(result).toEqual({ id: 'tier-1' });
  });
});
