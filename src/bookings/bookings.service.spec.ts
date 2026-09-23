import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingsService } from './bookings.service.js';
import { Booking } from './entities/booking.entity.js';
import { BookingPilgrim } from './entities/booking-pilgrim.entity.js';
import { BookingStatus } from './enums/booking-status.enum.js';
import { PaymentMode } from './enums/payment-mode.enum.js';
import { ReservationStatus } from './enums/reservation-status.enum.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { PackageTier } from '../packages/entities/package-tier.entity.js';
import { PackageStatus } from '../packages/enums/package-status.enum.js';
import { SeatReservationService } from '../seat-reservation/seat-reservation.service.js';
import { IdempotencyService } from '../common/services/idempotency.service.js';
import { InstallmentsService } from '../installments/installments.service.js';

describe('BookingsService (B06 — Group Booking, Snapshotting, Idempotency)', () => {
  let service: BookingsService;
  let mockBookingsRepository: any;
  let mockPilgrimsRepository: any;
  let mockSeatReservationService: any;
  let mockIdempotencyService: any;
  let mockDataSource: any;
  let mockEntityManager: any;
  let mockQueryBuilder: any;

  const mockUserA: User = {
    id: 'user-a-id',
    name: 'User A',
    email: 'userA@example.com',
    phone: null,
    passwordHash: 'hashed',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTier: PackageTier = {
    id: 'tier-vip-id',
    packageId: 'package-1-id',
    name: 'VIP Tier',
    price: 300000,
    quota: 20,
    heldSeats: 0,
    confirmedSeats: 0,
    version: 1,
    createdAt: new Date(),
    package: {
      id: 'package-1-id',
      name: 'Ramadan Umrah 2027',
      status: PackageStatus.PUBLISHED,
      departureDate: '2027-03-15',
      returnDate: '2027-03-29',
      bookingStartDate: '2026-10-01',
      bookingEndDate: '2027-02-15',
    } as any,
  };

  const mockBookingA: Booking = {
    id: 'booking-a-id',
    userId: 'user-a-id',
    packageId: 'package-1-id',
    tierId: 'tier-vip-id',
    status: BookingStatus.HELD,
    paymentMode: PaymentMode.FULL,
    tierNameSnapshot: 'VIP Tier',
    unitPriceSnapshot: 300000,
    totalAmount: 600000, // 2 pilgrims * 300000
    expiresAt: new Date(),
    version: 1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUserA,
    pilgrims: [],
    seatReservations: [],
  };

  const mockPilgrim1: BookingPilgrim = {
    id: 'pilgrim-1-id',
    bookingId: 'booking-a-id',
    fullName: 'Faishal',
    passportNumber: 'A12345678',
    nationality: 'Bangladesh',
    dateOfBirth: '1990-01-01',
    passportExpiry: '2030-01-01',
    status: 'ACTIVE',
    booking: null as any,
  };

  const mockPilgrim2: BookingPilgrim = {
    id: 'pilgrim-2-id',
    bookingId: 'booking-a-id',
    fullName: 'Father',
    passportNumber: 'A87654321',
    nationality: 'Bangladesh',
    dateOfBirth: '1960-01-01',
    passportExpiry: '2030-01-01',
    status: 'ACTIVE',
    booking: null as any,
  };

  beforeEach(async () => {
    mockBookingsRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn().mockImplementation(async (b) => b),
    };

    mockPilgrimsRepository = {
      findOne: vi.fn(),
      save: vi.fn().mockImplementation(async (p) => p),
      count: vi.fn(),
    };

    mockSeatReservationService = {
      holdSeats: vi.fn().mockResolvedValue({ id: 'res-id', status: 'HELD' }),
      releaseSeats: vi.fn().mockResolvedValue({ id: 'res-id', status: 'RELEASED' }),
    };

    mockIdempotencyService = {
      check: vi.fn().mockResolvedValue({ isDuplicate: false }),
      saveResponse: vi.fn().mockResolvedValue({ id: 'idem-id' }),
    };

    const mockInstallmentsService = {
      generateSchedule: vi.fn().mockResolvedValue([]),
    };

    mockQueryBuilder = {
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([]),
      getMany: vi.fn().mockResolvedValue([]),
    };

    mockEntityManager = {
      findOne: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((_entityClass, dto) => ({ ...dto, id: 'saved-id' })),
      save: vi.fn().mockImplementation(async (_entityClass, entity) => entity),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    mockBookingsRepository.createQueryBuilder = vi.fn().mockReturnValue(mockQueryBuilder);

    mockDataSource = {
      transaction: vi.fn().mockImplementation(async (cb) => cb(mockEntityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingsRepository,
        },
        {
          provide: getRepositoryToken(BookingPilgrim),
          useValue: mockPilgrimsRepository,
        },
        {
          provide: SeatReservationService,
          useValue: mockSeatReservationService,
        },
        {
          provide: IdempotencyService,
          useValue: mockIdempotencyService,
        },
        {
          provide: InstallmentsService,
          useValue: mockInstallmentsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  describe('createBooking (Group Booking & Price Snapshotting)', () => {
    it('should create group booking with immutable price snapshots and seat hold', async () => {
      mockEntityManager.findOne.mockResolvedValue({ ...mockTier });

      const createDto = {
        tier_id: 'tier-vip-id',
        payment_mode: PaymentMode.FULL,
        pilgrims: [
          { name: 'Faishal', passport_number: 'A12345678', nationality: 'Bangladesh' },
          { name: 'Father', passport_number: 'A87654321', nationality: 'Bangladesh' },
        ],
      };

      const result = await service.createBooking('user-a-id', createDto, 'idem-key-1');

      // Check snapshot fields
      expect(result.tierNameSnapshot).toBe('VIP Tier');
      expect(result.unitPriceSnapshot).toBe(300000);
      expect(result.totalAmount).toBe(600000); // 2 * 300000
      expect(result.status).toBe(BookingStatus.HELD);

      // Check seat hold called with quantity = 2
      expect(mockSeatReservationService.holdSeats).toHaveBeenCalledWith(
        'tier-vip-id',
        2,
        result.id,
        15,
        mockEntityManager,
      );

      // Check idempotency save
      expect(mockIdempotencyService.saveResponse).toHaveBeenCalled();
    });

    it('should create group booking with camelCase payload (packageId, tierId, paymentMode, fullName, passportNumber)', async () => {
      mockEntityManager.findOne.mockResolvedValue({ ...mockTier });

      const createDto = {
        packageId: 'ff9cec36-4876-4eda-b5d0-7ab43ed00119',
        tierId: 'tier-vip-id',
        paymentMode: PaymentMode.INSTALLMENT,
        pilgrims: [
          {
            fullName: 'md faishal 8288',
            passportNumber: '121212',
            nationality: 'Bangladesh',
          },
        ],
      };

      const result = await service.createBooking('user-a-id', createDto as any);

      expect(result.tierNameSnapshot).toBe('VIP Tier');
      expect(result.unitPriceSnapshot).toBe(300000);
      expect(result.totalAmount).toBe(300000);
      expect(result.status).toBe(BookingStatus.HELD);
      expect(result.paymentMode).toBe(PaymentMode.INSTALLMENT);
    });

    it('should return cached response when duplicate request with same idempotency key arrives', async () => {
      mockIdempotencyService.check.mockResolvedValue({
        isDuplicate: true,
        response: mockBookingA,
      });

      const createDto = {
        tier_id: 'tier-vip-id',
        payment_mode: PaymentMode.FULL,
        pilgrims: [{ name: 'Faishal', passport_number: 'A12345678' }],
      };

      const result = await service.createBooking('user-a-id', createDto, 'idem-key-dup');

      expect(result).toEqual(mockBookingA);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should reject booking if duplicate passport numbers are passed in same request', async () => {
      const createDto = {
        tier_id: 'tier-vip-id',
        payment_mode: PaymentMode.FULL,
        pilgrims: [
          { name: 'Faishal', passport_number: 'A12345678' },
          { name: 'Faishal Copy', passport_number: 'A12345678' },
        ],
      };

      await expect(
        service.createBooking('user-a-id', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject booking with ConflictException if passport overlaps with active booking travel dates', async () => {
      mockEntityManager.findOne.mockResolvedValue({ ...mockTier });
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        {
          passport_number: 'A12345678',
          booking_id: 'active-booking-99',
          booking_status: BookingStatus.CONFIRMED,
          package_name: 'Overlapping Hajj',
          departure_date: '2027-03-10',
          return_date: '2027-03-30',
        },
      ]);

      const createDto = {
        tier_id: 'tier-vip-id',
        payment_mode: PaymentMode.FULL,
        pilgrims: [{ name: 'Faishal', passport_number: 'A12345678' }],
      };

      await expect(
        service.createBooking('user-a-id', createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow booking if existing booking with same passport is CANCELLED or EXPIRED', async () => {
      mockEntityManager.findOne.mockResolvedValue({ ...mockTier });
      // Query builder filters out CANCELLED/EXPIRED, so getRawMany returns []
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([]);

      const createDto = {
        tier_id: 'tier-vip-id',
        payment_mode: PaymentMode.FULL,
        pilgrims: [{ name: 'Faishal', passport_number: 'A12345678' }],
      };

      const result = await service.createBooking('user-a-id', createDto);
      expect(result).toBeDefined();
      expect(result.status).toBe(BookingStatus.HELD);
    });

    it('should reject booking if package is not published', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        ...mockTier,
        package: { status: PackageStatus.DRAFT },
      });

      const createDto = {
        tier_id: 'tier-vip-id',
        payment_mode: PaymentMode.FULL,
        pilgrims: [{ name: 'Faishal', passport_number: 'A12345678' }],
      };

      await expect(
        service.createBooking('user-a-id', createDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('expireBookingAtomically & expireAllOverdueBookings', () => {
    it('should atomically expire booking and release held seats back to tier quota', async () => {
      const overdueHeldBooking: Booking = {
        ...mockBookingA,
        status: BookingStatus.HELD,
        expiresAt: new Date(Date.now() - 60000), // 1 min ago
      };

      const mockSeatReservation = {
        id: 'res-1',
        tierId: 'tier-vip-id',
        quantity: 2,
        status: ReservationStatus.HELD,
      };

      const lockedTier = {
        id: 'tier-vip-id',
        heldSeats: 2,
        confirmedSeats: 0,
      };

      mockEntityManager.findOne.mockImplementation((entityClass: any) => {
        if (entityClass === Booking) return Promise.resolve(overdueHeldBooking);
        if (entityClass === PackageTier) return Promise.resolve(lockedTier);
        return Promise.resolve(null);
      });
      mockEntityManager.find.mockResolvedValue([mockSeatReservation]);

      const result = await service.expireBookingAtomically('booking-a-id');

      expect(result.expired).toBe(true);
      expect(overdueHeldBooking.status).toBe(BookingStatus.EXPIRED);
      expect(lockedTier.heldSeats).toBe(0); // released 2 seats back
      expect(mockSeatReservation.status).toBe(ReservationStatus.RELEASED);
    });

    it('should not expire already CONFIRMED booking', async () => {
      const confirmedBooking: Booking = {
        ...mockBookingA,
        status: BookingStatus.CONFIRMED,
        expiresAt: new Date(Date.now() - 60000),
      };

      mockEntityManager.findOne.mockResolvedValue(confirmedBooking);

      const result = await service.expireBookingAtomically('booking-a-id');

      expect(result.expired).toBe(false);
      expect(confirmedBooking.status).toBe(BookingStatus.CONFIRMED);
    });
  });

  describe('cancelPilgrim (Partial Group Cancellation)', () => {
    it('should cancel individual pilgrim while keeping remaining active pilgrims', async () => {
      mockBookingsRepository.findOne.mockResolvedValue(mockBookingA);
      mockPilgrimsRepository.findOne.mockResolvedValue({ ...mockPilgrim1 });
      mockPilgrimsRepository.count.mockResolvedValue(1); // 1 active pilgrim remains

      const result = await service.cancelPilgrim(
        'booking-a-id',
        'pilgrim-1-id',
        mockUserA,
      );

      expect(result.status).toBe('CANCELLED');
      expect(mockPilgrimsRepository.save).toHaveBeenCalled();
      expect(mockBookingsRepository.save).not.toHaveBeenCalled(); // booking not cancelled yet
    });

    it('should cancel the entire booking if the last active pilgrim is cancelled', async () => {
      mockBookingsRepository.findOne.mockResolvedValue(mockBookingA);
      mockPilgrimsRepository.findOne.mockResolvedValue({ ...mockPilgrim2 });
      mockPilgrimsRepository.count.mockResolvedValue(0); // 0 active pilgrims remain

      await service.cancelPilgrim('booking-a-id', 'pilgrim-2-id', mockUserA);

      expect(mockBookingsRepository.save).toHaveBeenCalled();
    });
  });
});
