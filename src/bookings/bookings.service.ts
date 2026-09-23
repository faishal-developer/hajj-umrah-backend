import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity.js';
import { BookingPilgrim } from './entities/booking-pilgrim.entity.js';
import { SeatReservation } from './entities/seat-reservation.entity.js';
import { BookingStatus } from './enums/booking-status.enum.js';
import { ReservationStatus } from './enums/reservation-status.enum.js';
import { PaymentMode } from './enums/payment-mode.enum.js';
import { User } from '../users/entities/user.entity.js';
import { Package } from '../packages/entities/package.entity.js';
import { PackageTier } from '../packages/entities/package-tier.entity.js';
import { PackageStatus } from '../packages/enums/package-status.enum.js';
import { SeatReservationService } from '../seat-reservation/seat-reservation.service.js';
import { IdempotencyService } from '../common/services/idempotency.service.js';
import { OwnershipValidator } from '../common/utils/ownership.util.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { InstallmentsService } from '../installments/installments.service.js';

export const ACTIVE_BOOKING_STATUSES = [
  BookingStatus.HELD,
  BookingStatus.PENDING_PAYMENT,
  BookingStatus.PARTIALLY_PAID,
  BookingStatus.CONFIRMED,
];

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(BookingPilgrim)
    private readonly pilgrimsRepository: Repository<BookingPilgrim>,
    private readonly seatReservationService: SeatReservationService,
    private readonly idempotencyService: IdempotencyService,
    private readonly dataSource: DataSource,
    private readonly installmentsService?: InstallmentsService,
  ) {}

  /**
   * Creates a group booking with immutable price snapshotting, seat reservation, and idempotency.
   */
  async createBooking(
    userId: string,
    dto: CreateBookingDto,
    idempotencyKey?: string,
  ): Promise<Booking> {
    const tierId = dto.tierId || dto.tier_id;
    const paymentMode = dto.paymentMode || dto.payment_mode;

    if (!tierId) {
      throw new BadRequestException('Package tier ID is required');
    }
    if (!paymentMode) {
      throw new BadRequestException('Payment mode is required');
    }

    if (!dto.pilgrims || dto.pilgrims.length === 0) {
      throw new BadRequestException('At least one pilgrim must be included in the booking');
    }

    // 1. Check idempotency if key provided
    if (idempotencyKey) {
      const { isDuplicate, response } = await this.idempotencyService.check(
        '/bookings',
        idempotencyKey,
        dto,
      );
      if (isDuplicate && response) {
        return response as Booking;
      }
    }

    // 2. Validate internal passport uniqueness within the same booking
    const rawPassports = dto.pilgrims
      .map((p) => (p.passportNumber || p.passport_number || '').trim().toUpperCase())
      .filter(Boolean);

    const uniquePassports = new Set(rawPassports);
    if (uniquePassports.size !== rawPassports.length) {
      throw new BadRequestException(
        'Duplicate passport number found within the booking pilgrim list',
      );
    }

    return this.dataSource.transaction(async (manager: EntityManager) => {
      // 3. Load tier and parent package
      const tier = await manager.findOne(PackageTier, {
        where: { id: tierId },
        relations: { package: true },
      });

      if (!tier) {
        throw new NotFoundException(`Package tier with ID "${tierId}" not found`);
      }

      if (tier.package.status !== PackageStatus.PUBLISHED) {
        throw new BadRequestException('Package is not published for bookings');
      }

      // 4. Validate package dates (cannot book backdated or expired packages)
      const today = new Date().toISOString().split('T')[0];
      if (
        tier.package.bookingEndDate < today ||
        tier.package.departureDate < today
      ) {
        throw new BadRequestException(
          'Package booking deadline or departure date has already passed',
        );
      }

      // 5. Check overlapping travel periods for all pilgrims across active bookings
      const newStart = tier.package.departureDate;
      const newEnd = tier.package.returnDate || tier.package.departureDate;

      if (uniquePassports.size > 0) {
        const conflictingPilgrims = await manager
          .createQueryBuilder(BookingPilgrim, 'pilgrim')
          .innerJoin('pilgrim.booking', 'booking')
          .innerJoin(Package, 'package', 'package.id = booking.packageId')
          .where('UPPER(TRIM(pilgrim.passportNumber)) IN (:...passports)', {
            passports: Array.from(uniquePassports),
          })
          .andWhere('pilgrim.status = :pilgrimStatus', { pilgrimStatus: 'ACTIVE' })
          .andWhere('booking.status IN (:...activeStatuses)', {
            activeStatuses: ACTIVE_BOOKING_STATUSES,
          })
          .andWhere(
            '(package.departureDate <= :newEnd AND COALESCE(package.returnDate, package.departureDate) >= :newStart)',
            { newStart, newEnd },
          )
          .select([
            'pilgrim.passportNumber AS passport_number',
            'booking.id AS booking_id',
            'booking.status AS booking_status',
            'package.name AS package_name',
            'package.departureDate AS departure_date',
            'COALESCE(package.returnDate, package.departureDate) AS return_date',
          ])
          .getRawMany();

        if (conflictingPilgrims.length > 0) {
          const conflict = conflictingPilgrims[0];
          throw new ConflictException(
            `PILGRIM_TRAVEL_OVERLAP: Pilgrim with passport "${conflict.passport_number}" is already registered in active booking "${conflict.booking_id}" (${conflict.booking_status}) for overlapping period ${conflict.departure_date} to ${conflict.return_date}`,
          );
        }
      }

      // 6. Freeze price snapshot (IMMUTABLE SNAPSHOT)
      const tierNameSnapshot = tier.name;
      const unitPriceSnapshot = tier.price;
      const pilgrimCount = dto.pilgrims.length;
      const totalAmount = unitPriceSnapshot * pilgrimCount;

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // 7. Create booking entity
      const booking = manager.create(Booking, {
        userId,
        packageId: tier.packageId,
        tierId: tier.id,
        status: BookingStatus.HELD,
        paymentMode,
        tierNameSnapshot,
        unitPriceSnapshot,
        totalAmount,
        expiresAt,
        version: 1,
      });

      const savedBooking = await manager.save(Booking, booking);

      // 8. Create pilgrims under the booking
      const pilgrims = dto.pilgrims.map((p) =>
        manager.create(BookingPilgrim, {
          bookingId: savedBooking.id,
          fullName: p.fullName || p.full_name || p.name || '',
          passportNumber: (p.passportNumber || p.passport_number || '').trim().toUpperCase(),
          nationality: p.nationality || null,
          dateOfBirth: p.dateOfBirth || p.date_of_birth || null,
          passportExpiry: p.passportExpiry || p.passport_expiry || null,
          status: 'ACTIVE',
        }),
      );

      savedBooking.pilgrims = await manager.save(BookingPilgrim, pilgrims);

      // 9. Hold seats safely with pessimistic locking inside this transaction
      await this.seatReservationService.holdSeats(
        tier.id,
        pilgrimCount,
        savedBooking.id,
        15,
        manager,
      );

      // 10. If payment mode is INSTALLMENT, generate installment schedule
      if (paymentMode === PaymentMode.INSTALLMENT && this.installmentsService) {
        await this.installmentsService.generateSchedule(
          savedBooking.id,
          totalAmount,
          tier.package.departureDate,
          3,
          manager,
        );
      }

      // 11. Store idempotency record
      if (idempotencyKey) {
        await this.idempotencyService.saveResponse(
          '/bookings',
          idempotencyKey,
          userId,
          dto,
          savedBooking,
          manager,
        );
      }

      return savedBooking;
    });
  }

  /**
   * Concurrency-safe atomic expiration of a booking.
   * Marks booking as EXPIRED and releases all held seats back to the package tier quota.
   */
  async expireBookingAtomically(
    bookingId: string,
    externalManager?: EntityManager,
  ): Promise<{ expired: boolean; booking: Booking | null }> {
    const execute = async (manager: EntityManager) => {
      // 1. Lock booking row using SELECT FOR UPDATE
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        return { expired: false, booking: null };
      }

      // Only HELD or PENDING_PAYMENT can expire
      if (
        booking.status !== BookingStatus.HELD &&
        booking.status !== BookingStatus.PENDING_PAYMENT
      ) {
        return { expired: false, booking };
      }

      const now = new Date();
      if (booking.expiresAt && booking.expiresAt > now) {
        return { expired: false, booking };
      }

      // Mark booking EXPIRED
      booking.status = BookingStatus.EXPIRED;
      const savedBooking = await manager.save(Booking, booking);

      // 2. Lock SeatReservations and Tier to release seats atomically
      const reservations = await manager.find(SeatReservation, {
        where: { bookingId },
        lock: { mode: 'pessimistic_write' },
      });

      for (const res of reservations) {
        if (res.status === ReservationStatus.HELD) {
          const tier = await manager.findOne(PackageTier, {
            where: { id: res.tierId },
            lock: { mode: 'pessimistic_write' },
          });

          if (tier) {
            tier.heldSeats = Math.max(0, tier.heldSeats - res.quantity);
            await manager.save(PackageTier, tier);
          }

          res.status = ReservationStatus.RELEASED;
          await manager.save(SeatReservation, res);
        }
      }

      return { expired: true, booking: savedBooking };
    };

    if (externalManager) {
      return execute(externalManager);
    }
    return this.dataSource.transaction(async (manager) => execute(manager));
  }

  /**
   * Sweeps all overdue HELD / PENDING_PAYMENT bookings and expires them atomically.
   */
  async expireAllOverdueBookings(): Promise<number> {
    const now = new Date();
    const overdueBookings = await this.bookingsRepository
      .createQueryBuilder('booking')
      .where('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.HELD, BookingStatus.PENDING_PAYMENT],
      })
      .andWhere('booking.expiresAt IS NOT NULL')
      .andWhere('booking.expiresAt <= :now', { now })
      .getMany();

    let count = 0;
    for (const b of overdueBookings) {
      try {
        const { expired } = await this.expireBookingAtomically(b.id);
        if (expired) count++;
      } catch {
        // Continue with remaining
      }
    }
    return count;
  }

  /**
   * Retrieves all bookings belonging to the authenticated user.
   */
  async findForUser(userId: string): Promise<Booking[]> {
    const bookings = await this.bookingsRepository.find({
      where: { userId },
      relations: { pilgrims: true, seatReservations: true },
      order: { createdAt: 'DESC' },
    });

    // Lazy check: check if any HELD booking has expired
    const now = new Date();
    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      if (
        (b.status === BookingStatus.HELD ||
          b.status === BookingStatus.PENDING_PAYMENT) &&
        b.expiresAt &&
        b.expiresAt <= now
      ) {
        const { booking: expiredBooking } = await this.expireBookingAtomically(
          b.id,
        );
        if (expiredBooking) {
          bookings[i] = expiredBooking;
        }
      }
    }

    return bookings;
  }

  /**
   * Retrieves all bookings in the system (Admin only).
   */
  async findAll(): Promise<Booking[]> {
    return this.bookingsRepository.find({
      relations: { pilgrims: true, seatReservations: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves a single booking by ID.
   */
  async findById(id: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: { pilgrims: true, seatReservations: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    return booking;
  }

  /**
   * Retrieves a booking and validates ownership.
   */
  async findByIdAndValidateOwnership(
    id: string,
    currentUser: User,
  ): Promise<Booking> {
    const booking = await this.findById(id);
    OwnershipValidator.validate(booking.userId, currentUser, 'booking');

    // Lazy check: if booking is overdue, auto-expire it
    if (
      (booking.status === BookingStatus.HELD ||
        booking.status === BookingStatus.PENDING_PAYMENT) &&
      booking.expiresAt &&
      booking.expiresAt <= new Date()
    ) {
      const { booking: expiredBooking } = await this.expireBookingAtomically(
        booking.id,
      );
      if (expiredBooking) {
        return expiredBooking;
      }
    }

    return booking;
  }

  /**
   * Cancels a booking entirely and releases seats.
   */
  async cancelBooking(
    id: string,
    currentUser: User,
    _reason?: string,
  ): Promise<Booking> {
    const booking = await this.findByIdAndValidateOwnership(id, currentUser);

    if (booking.status === BookingStatus.CANCELLED) {
      return booking;
    }

    booking.status = BookingStatus.CANCELLED;
    const updatedBooking = await this.bookingsRepository.save(booking);

    // Release seats
    try {
      await this.seatReservationService.releaseSeats(booking.id);
    } catch {
      // Ignore if no seats were reserved or already released
    }

    return updatedBooking;
  }

  /**
   * Cancels an individual pilgrim under a booking (Partial Group Cancellation).
   */
  async cancelPilgrim(
    bookingId: string,
    pilgrimId: string,
    currentUser: User,
  ): Promise<BookingPilgrim> {
    await this.findByIdAndValidateOwnership(bookingId, currentUser);

    const pilgrim = await this.pilgrimsRepository.findOne({
      where: { id: pilgrimId, bookingId },
    });

    if (!pilgrim) {
      throw new NotFoundException(
        `Pilgrim with ID "${pilgrimId}" not found in booking "${bookingId}"`,
      );
    }

    if (pilgrim.status === 'CANCELLED') {
      return pilgrim;
    }

    pilgrim.status = 'CANCELLED';
    await this.pilgrimsRepository.save(pilgrim);

    // Check remaining active pilgrims in booking
    const activePilgrims = await this.pilgrimsRepository.count({
      where: { bookingId, status: 'ACTIVE' },
    });

    if (activePilgrims === 0) {
      await this.cancelBooking(bookingId, currentUser);
    }

    return pilgrim;
  }

  /**
   * Updates booking lifecycle state (HELD -> PENDING_PAYMENT -> CONFIRMED, etc.).
   */
  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    const booking = await this.findById(id);
    booking.status = status;
    return this.bookingsRepository.save(booking);
  }
}
