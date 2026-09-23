import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { TiersService } from './tiers.service.js';
import { PackageTier } from './entities/package-tier.entity.js';
import { PackagesService } from './packages.service.js';

describe('TiersService', () => {
  let service: TiersService;
  let mockTiersRepository: any;
  let mockPackagesService: any;

  const mockTier: PackageTier = {
    id: 'tier-1-id',
    packageId: 'package-1-id',
    name: 'Economy',
    price: 180000,
    quota: 50,
    heldSeats: 5,
    confirmedSeats: 15,
    version: 2,
    createdAt: new Date(),
    package: null as any,
  };

  beforeEach(async () => {
    mockTiersRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn().mockImplementation((dto) => ({ ...dto, id: 'new-tier-id' })),
      save: vi.fn().mockImplementation(async (tier) => ({ ...tier, version: (tier.version || 1) + 1 })),
    };

    mockPackagesService = {
      findById: vi.fn().mockResolvedValue({ id: 'package-1-id' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TiersService,
        {
          provide: getRepositoryToken(PackageTier),
          useValue: mockTiersRepository,
        },
        {
          provide: PackagesService,
          useValue: mockPackagesService,
        },
      ],
    }).compile();

    service = module.get<TiersService>(TiersService);
  });

  describe('create', () => {
    it('should create a tier with initial version 1 and 0 seats taken', async () => {
      const dto = {
        name: 'VIP Tier',
        price: 300000,
        quota: 20,
      };

      await service.create('package-1-id', dto);

      expect(mockPackagesService.findById).toHaveBeenCalledWith('package-1-id');
      expect(mockTiersRepository.create).toHaveBeenCalledWith({
        packageId: 'package-1-id',
        name: dto.name,
        price: dto.price,
        quota: dto.quota,
        heldSeats: 0,
        confirmedSeats: 0,
        version: 1,
      });
      expect(mockTiersRepository.save).toHaveBeenCalled();
    });
  });

  describe('update with optimistic locking and quota validation', () => {
    it('should update tier when version matches', async () => {
      mockTiersRepository.findOne.mockResolvedValue({ ...mockTier });

      const result = await service.update('tier-1-id', {
        price: 190000,
        version: 2,
      });

      expect(result.price).toBe(190000);
      expect(mockTiersRepository.save).toHaveBeenCalled();
    });

    it('should throw 409 ConflictException when updating with stale version', async () => {
      mockTiersRepository.findOne.mockResolvedValue({ ...mockTier, version: 3 });

      await expect(
        service.update('tier-1-id', {
          price: 190000,
          version: 2, // Stale!
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when reducing quota below active reserved + confirmed seats', async () => {
      // mockTier has 15 confirmed + 5 held = 20 active seats
      mockTiersRepository.findOne.mockResolvedValue({ ...mockTier, version: 2 });

      await expect(
        service.update('tier-1-id', {
          quota: 10, // 10 < 20 active seats!
          version: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow reducing quota as long as it remains >= active seats', async () => {
      mockTiersRepository.findOne.mockResolvedValue({ ...mockTier, version: 2 });

      const result = await service.update('tier-1-id', {
        quota: 25, // 25 >= 20 active seats
        version: 2,
      });

      expect(result.quota).toBe(25);
    });
  });
});
