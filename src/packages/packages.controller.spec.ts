import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PackagesController } from './packages.controller.js';
import { PackagesService } from './packages.service.js';

describe('PackagesController', () => {
  let controller: PackagesController;
  let service: PackagesService;

  const mockService = {
    findPublished: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue({ id: 'pkg-1', name: 'Umrah' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PackagesController],
      providers: [
        {
          provide: PackagesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PackagesController>(PackagesController);
    service = module.get<PackagesService>(PackagesService);
  });

  it('getPublishedPackages should call packagesService.findPublished', async () => {
    const query = { page: 1, limit: 10, type: 'HAJJ' };
    const result = await controller.getPublishedPackages(query);

    expect(service.findPublished).toHaveBeenCalledWith(query);
    expect(result).toEqual([]);
  });

  it('getPackageDetails should call packagesService.findById with publishedOnly=true', async () => {
    const result = await controller.getPackageDetails('pkg-1');

    expect(service.findById).toHaveBeenCalledWith('pkg-1', true);
    expect(result).toEqual({ id: 'pkg-1', name: 'Umrah' });
  });
});
