import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity.js';
import { BookingPilgrim } from './entities/booking-pilgrim.entity.js';
import { BookingStatus } from './enums/booking-status.enum.js';
import { PaymentMode } from './enums/payment-mode.enum.js';
import { User } from '../users/entities/user.entity.js';
import { PackageTier } from '../packages/entities/package-tier.entity.js';
import { PackageStatus } from '../packages/enums/package-status.enum.js';
import { SeatReservationService } from '../seat-reservation/seat-reservation.service.js';
import { IdempotencyService } from '../common/services/idempotency.service.js';
import { OwnershipValidator } from '../common/utils/ownership.util.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { InstallmentsService } from '../installments/installments.service.js';

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

    return this.dataSource.transaction(async (manager: EntityManager) => {
      // 2. Load tier and parent package
      const tier = await manager.findOne(PackageTier, {
        where: { id: dto.tier_id },
        relations: { package: true },
      });

      if (!tier) {
        throw new NotFoundException(`Package tier with ID "${dto.tier_id}" not found`);
      }

      if (tier.package.status !== PackageStatus.PUBLISHED) {
        throw new BadRequestException('Package is not published for bookings');
      }

      // 3. Freeze price snapshot (IMMUTABLE SNAPSHOT)
      const tierNameSnapshot = tier.name;
      const unitPriceSnapshot = tier.price;
      const pilgrimCount = dto.pilgrims.length;
      const totalAmount = unitPriceSnapshot * pilgrimCount;

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // 4. Create booking entity
      const booking = manager.create(Booking, {
        userId,
        packageId: tier.packageId,
        tierId: tier.id,
        status: BookingStatus.HELD,
        paymentMode: dto.payment_mode,
        tierNameSnapshot,
        unitPriceSnapshot,
        totalAmount,
        expiresAt,
        version: 1,
      });

      const savedBooking = await manager.save(Booking, booking);

      // 5. Create pilgrims under the booking
      const pilgrims = dto.pilgrims.map((p) =>
        manager.create(BookingPilgrim, {
          bookingId: savedBooking.id,
          fullName: p.name,
          passportNumber: p.passport_number,
          nationality: p.nationality || null,
          dateOfBirth: p.date_of_birth || null,
          passportExpiry: p.passport_expiry || null,
          status: 'ACTIVE',
        }),
      );

      savedBooking.pilgrims = await manager.save(BookingPilgrim, pilgrims);

      // 6. Hold seats safely with pessimistic locking inside this transaction
      await this.seatReservationService.holdSeats(
        tier.id,
        pilgrimCount,
        savedBooking.id,
        15,
        manager,
      );

      // 7. If payment mode is INSTALLMENT, generate installment schedule
      if (dto.payment_mode === PaymentMode.INSTALLMENT && this.installmentsService) {
        await this.installmentsService.generateSchedule(
          savedBooking.id,
          totalAmount,
          tier.package.departureDate,
          3,
          manager,
        );
      }

      // 8. Store idempotency record
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
   * Retrieves all bookings belonging to the authenticated user.
   */
  async findForUser(userId: string): Promise<Booking[]> {
    return this.bookingsRepository.find({
      where: { userId },
      relations: { pilgrims: true, seatReservations: true },
      order: { createdAt: 'DESC' },
    });
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
