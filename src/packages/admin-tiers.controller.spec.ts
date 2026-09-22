import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminTiersController } from './admin-tiers.controller.js';
import { TiersService } from './tiers.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

describe('AdminTiersController', () => {
  let controller: AdminTiersController;
  let tiersService: TiersService;

  const mockTiersService = {
    update: vi.fn().mockResolvedValue({ id: 'tier-1', price: 220000, version: 2 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTiersController],
      providers: [
        { provide: TiersService, useValue: mockTiersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminTiersController>(AdminTiersController);
    tiersService = module.get<TiersService>(TiersService);
  });

  it('updateTier should call tiersService.update with version', async () => {
    const dto = { price: 220000, version: 1 };
    const result = await controller.updateTier('tier-1', dto);

    expect(tiersService.update).toHaveBeenCalledWith('tier-1', dto);
    expect(result).toEqual({ id: 'tier-1', price: 220000, version: 2 });
  });
});
