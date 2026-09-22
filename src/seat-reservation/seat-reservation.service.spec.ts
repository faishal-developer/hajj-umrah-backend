import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { SeatReservationService } from './seat-reservation.service.js';
import { SeatReservation } from '../bookings/entities/seat-reservation.entity.js';
import { ReservationStatus } from '../bookings/enums/reservation-status.enum.js';
import { PackageTier } from '../packages/entities/package-tier.entity.js';

describe('SeatReservationService (B05 — Seat Reservation Engine)', () => {
  let service: SeatReservationService;
  let mockReservationRepository: any;
  let mockTierRepository: any;
  let mockDataSource: any;
  let mockEntityManager: any;

  const mockTier: PackageTier = {
    id: 'tier-uuid',
    packageId: 'package-uuid',
    name: 'Economy',
    price: 150000,
    quota: 10,
    heldSeats: 2,
    confirmedSeats: 5,
    version: 1,
    createdAt: new Date(),
    package: null as any,
  };

  const mockHeldReservation: SeatReservation = {
    id: 'reservation-uuid',
    bookingId: 'booking-uuid',
    tierId: 'tier-uuid',
    quantity: 2,
    status: ReservationStatus.HELD,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    createdAt: new Date(),
    booking: null as any,
  };

  beforeEach(async () => {
    mockEntityManager = {
      findOne: vi.fn(),
      save: vi.fn().mockImplementation(async (_entityClass, entity) => entity),
      create: vi.fn().mockImplementation((_entityClass, dto) => ({ ...dto, id: 'new-res-id' })),
    };

    mockDataSource = {
      transaction: vi.fn().mockImplementation(async (cb) => cb(mockEntityManager)),
    };

    mockReservationRepository = {
      createQueryBuilder: vi.fn(),
    };

    mockTierRepository = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatReservationService,
        {
          provide: getRepositoryToken(SeatReservation),
          useValue: mockReservationRepository,
        },
        {
          provide: getRepositoryToken(PackageTier),
          useValue: mockTierRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<SeatReservationService>(SeatReservationService);
  });

  describe('holdSeats', () => {
    it('should hold seats within a SELECT FOR UPDATE transaction when quota is available', async () => {
      // quota = 10, held = 2, confirmed = 5 => available = 3
      mockEntityManager.findOne.mockResolvedValue({ ...mockTier });

      const result = await service.holdSeats('tier-uuid', 2, 'booking-uuid', 15);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(PackageTier, {
        where: { id: 'tier-uuid' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(result.quantity).toBe(2);
      expect(result.status).toBe(ReservationStatus.HELD);
      expect(result.expiresAt).toBeDefined();
    });

    it('should throw 409 ConflictException when available quota is less than requested quantity', async () => {
      // quota = 10, held = 2, confirmed = 5 => available = 3, requesting 4
      mockEntityManager.findOne.mockResolvedValue({ ...mockTier });

      await expect(
        service.holdSeats('tier-uuid', 4, 'booking-uuid', 15),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when tier does not exist', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(
        service.holdSeats('non-existent-tier', 1, 'booking-uuid', 15),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmSeats', () => {
    it('should transition held seats to confirmed seats and set status to CONFIRMED', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({ ...mockHeldReservation })
        .mockResolvedValueOnce({ ...mockTier, heldSeats: 2, confirmedSeats: 5 });

      const result = await service.confirmSeats('booking-uuid');

      expect(result.status).toBe(ReservationStatus.CONFIRMED);
      expect(result.expiresAt).toBeNull();
    });

    it('should throw NotFoundException if no held reservation is found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(service.confirmSeats('non-existent-booking')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('releaseSeats', () => {
    it('should release held seats back to quota and set status to RELEASED', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce({ ...mockHeldReservation })
        .mockResolvedValueOnce({ ...mockTier, heldSeats: 2, confirmedSeats: 5 });

      const result = await service.releaseSeats('booking-uuid');

      expect(result.status).toBe(ReservationStatus.RELEASED);
    });
  });

  describe('Concurrency Simulation (Checkpoint: 1 seat left, 2 concurrent users)', () => {
    it('should allow only one user to succeed and reject the second when 1 seat remains', async () => {
      // Shared tier state with only 1 seat remaining (quota = 1, held = 0, confirmed = 0)
      const liveTierState = {
        id: 'tier-last-seat',
        packageId: 'package-uuid',
        name: 'Last Seat Tier',
        price: 200000,
        quota: 1,
        heldSeats: 0,
        confirmedSeats: 0,
        version: 1,
        createdAt: new Date(),
        package: null as any,
      };

      // Create a mutex lock to simulate PostgreSQL row-level transaction lock (SELECT FOR UPDATE)
      let isRowLocked = false;
      const queue: Array<() => void> = [];

      const acquireLock = async () => {
        if (isRowLocked) {
          await new Promise<void>((resolve) => queue.push(resolve));
        }
        isRowLocked = true;
      };

      const releaseLock = () => {
        isRowLocked = false;
        const next = queue.shift();
        if (next) next();
      };

      mockDataSource.transaction.mockImplementation(async (cb: (em: EntityManager) => Promise<any>) => {
        await acquireLock();
        try {
          const customManager: any = {
            findOne: vi.fn().mockImplementation(async (_entity, query) => {
              if (query.where.id === 'tier-last-seat') {
                return { ...liveTierState };
              }
              return null;
            }),
            save: vi.fn().mockImplementation(async (entityClass, entity) => {
              if (entityClass === PackageTier) {
                liveTierState.heldSeats = entity.heldSeats;
                liveTierState.confirmedSeats = entity.confirmedSeats;
              }
              return entity;
            }),
            create: vi.fn().mockImplementation((_entityClass, dto) => dto),
          };
          return await cb(customManager);
        } finally {
          releaseLock();
        }
      });

      // Two users simultaneously request the 1 remaining seat
      const user1Promise = service.holdSeats('tier-last-seat', 1, 'booking-user-1', 15);
      const user2Promise = service.holdSeats('tier-last-seat', 1, 'booking-user-2', 15);

      const results = await Promise.allSettled([user1Promise, user2Promise]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly ONE must succeed
      expect(fulfilled.length).toBe(1);
      // Exactly ONE must be rejected with 409 Conflict
      expect(rejected.length).toBe(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);

      // Held seats must strictly equal 1 (no overselling)
      expect(liveTierState.heldSeats).toBe(1);
      expect(liveTierState.heldSeats + liveTierState.confirmedSeats).toBe(liveTierState.quota);
    });
  });
});
