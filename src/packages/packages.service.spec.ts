import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PackagesService } from './packages.service.js';
import { Package } from './entities/package.entity.js';
import { PackageStatus } from './enums/package-status.enum.js';

describe('PackagesService', () => {
  let service: PackagesService;
  let mockPackagesRepository: any;

  const mockDraftPackage: Package = {
    id: 'package-1-id',
    name: 'Ramadan Umrah 2027',
    type: 'RAMADAN_UMRAH',
    description: '14-day Ramadan package',
    departureDate: '2027-03-15',
    bookingStartDate: '2026-10-01',
    bookingEndDate: '2027-02-15',
    status: PackageStatus.DRAFT,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    tiers: [],
  };

  const mockPublishedPackage: Package = {
    ...mockDraftPackage,
    id: 'package-2-id',
    status: PackageStatus.PUBLISHED,
  };

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockPublishedPackage]),
    };

    mockPackagesRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn().mockImplementation((dto) => ({ ...dto, id: 'new-id' })),
      save: vi.fn().mockImplementation(async (pkg) => ({ ...pkg, version: (pkg.version || 1) + 1 })),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackagesService,
        {
          provide: getRepositoryToken(Package),
          useValue: mockPackagesRepository,
        },
      ],
    }).compile();

    service = module.get<PackagesService>(PackagesService);
  });

  describe('findPublished', () => {
    it('should query packages with status = PUBLISHED', async () => {
      const result = await service.findPublished({ page: 1, limit: 20 });
      expect(result).toEqual([mockPublishedPackage]);
    });
  });

  describe('create', () => {
    it('should create a package in DRAFT status with initial version 1', async () => {
      const dto = {
        name: 'Hajj VIP 2027',
        type: 'HAJJ',
        description: 'VIP Hajj',
        departure_date: '2027-06-01',
        booking_start_date: '2026-12-01',
        booking_end_date: '2027-04-01',
      };

      await service.create(dto);

      expect(mockPackagesRepository.create).toHaveBeenCalledWith({
        name: dto.name,
        type: dto.type,
        description: dto.description,
        departureDate: dto.departure_date,
        bookingStartDate: dto.booking_start_date,
        bookingEndDate: dto.booking_end_date,
        status: PackageStatus.DRAFT,
        version: 1,
      });
      expect(mockPackagesRepository.save).toHaveBeenCalled();
    });
  });

  describe('update with optimistic locking', () => {
    it('should successfully update when version matches current package version', async () => {
      mockPackagesRepository.findOne.mockResolvedValue({
        ...mockDraftPackage,
        version: 5,
      });

      const result = await service.update('package-1-id', {
        name: 'Updated Name',
        version: 5,
      });

      expect(result.name).toBe('Updated Name');
      expect(mockPackagesRepository.save).toHaveBeenCalled();
    });

    it('should throw 409 ConflictException when updating with a stale version', async () => {
      mockPackagesRepository.findOne.mockResolvedValue({
        ...mockDraftPackage,
        version: 5,
      });

      await expect(
        service.update('package-1-id', {
          name: 'Stale Update',
          version: 4, // Stale version!
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if package does not exist', async () => {
      mockPackagesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', {
          name: 'Update',
          version: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('publish and archive lifecycle', () => {
    it('should publish a draft package', async () => {
      mockPackagesRepository.findOne.mockResolvedValue({ ...mockDraftPackage });

      const result = await service.publish('package-1-id');

      expect(result.status).toBe(PackageStatus.PUBLISHED);
      expect(mockPackagesRepository.save).toHaveBeenCalled();
    });

    it('should archive a package', async () => {
      mockPackagesRepository.findOne.mockResolvedValue({ ...mockPublishedPackage });

      const result = await service.archive('package-2-id');

      expect(result.status).toBe(PackageStatus.ARCHIVED);
      expect(mockPackagesRepository.save).toHaveBeenCalled();
    });
  });
});
