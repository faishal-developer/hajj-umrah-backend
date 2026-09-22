import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SeatReservation } from '../bookings/entities/seat-reservation.entity.js';
import { ReservationStatus } from '../bookings/enums/reservation-status.enum.js';
import { PackageTier } from '../packages/entities/package-tier.entity.js';

@Injectable()
export class SeatReservationService {
  constructor(
    @InjectRepository(SeatReservation)
    private readonly reservationRepository: Repository<SeatReservation>,
    @InjectRepository(PackageTier)
    private readonly tierRepository: Repository<PackageTier>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Holds seats for a booking using pessimistic row locking (SELECT FOR UPDATE).
   * Prevents race conditions and overselling.
   *
   * @param tierId Target package tier UUID
   * @param quantity Number of seats to reserve
   * @param bookingId Associated booking UUID
   * @param holdMinutes Expiration duration for the hold (default 15 mins)
   * @param externalManager Optional existing transaction manager
   */
  async holdSeats(
    tierId: string,
    quantity: number,
    bookingId: string,
    holdMinutes = 15,
    externalManager?: EntityManager,
  ): Promise<SeatReservation> {
    const execute = async (manager: EntityManager) => {
      // 1. Lock package_tiers row using SELECT FOR UPDATE
      const tier = await manager.findOne(PackageTier, {
        where: { id: tierId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!tier) {
        throw new NotFoundException(`Package tier with ID "${tierId}" not found`);
      }

      // 2. Check available quota
      const activeSeats = tier.heldSeats + tier.confirmedSeats;
      const availableQuota = tier.quota - activeSeats;

      if (availableQuota < quantity) {
        throw new ConflictException(
          `SEAT_UNAVAILABLE: requested ${quantity} seat(s), but only ${availableQuota} seat(s) available in tier "${tier.name}"`,
        );
      }

      // 3. Update held seats on the locked tier row
      tier.heldSeats += quantity;
      await manager.save(PackageTier, tier);

      // 4. Create seat reservation record with expiration
      const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);
      const reservation = manager.create(SeatReservation, {
        tierId,
        bookingId,
        quantity,
        status: ReservationStatus.HELD,
        expiresAt,
      });

      return manager.save(SeatReservation, reservation);
    };

    if (externalManager) {
      return execute(externalManager);
    }

    return this.dataSource.transaction(async (manager) => {
      return execute(manager);
    });
  }

  /**
   * Confirms a held reservation upon payment or confirmation.
   * Transitions held seats to confirmed seats on the tier.
   */
  async confirmSeats(
    bookingId: string,
    externalManager?: EntityManager,
  ): Promise<SeatReservation> {
    const execute = async (manager: EntityManager) => {
      const reservation = await manager.findOne(SeatReservation, {
        where: { bookingId, status: ReservationStatus.HELD },
      });

      if (!reservation) {
        throw new NotFoundException(
          `No active held reservation found for booking "${bookingId}"`,
        );
      }

      // Lock tier to update seat counts
      const tier = await manager.findOne(PackageTier, {
        where: { id: reservation.tierId },
        lock: { mode: 'pessimistic_write' },
      });

      if (tier) {
        tier.heldSeats = Math.max(0, tier.heldSeats - reservation.quantity);
        tier.confirmedSeats += reservation.quantity;
        await manager.save(PackageTier, tier);
      }

      reservation.status = ReservationStatus.CONFIRMED;
      reservation.expiresAt = null;
      return manager.save(SeatReservation, reservation);
    };

    if (externalManager) {
      return execute(externalManager);
    }

    return this.dataSource.transaction(async (manager) => {
      return execute(manager);
    });
  }

  /**
   * Releases seats from a held or confirmed reservation back to the available quota.
   */
  async releaseSeats(
    bookingId: string,
    externalManager?: EntityManager,
  ): Promise<SeatReservation> {
    const execute = async (manager: EntityManager) => {
      const reservation = await manager.findOne(SeatReservation, {
        where: { bookingId },
      });

      if (!reservation || reservation.status === ReservationStatus.RELEASED) {
        throw new NotFoundException(
          `No active reservation to release for booking "${bookingId}"`,
        );
      }

      const tier = await manager.findOne(PackageTier, {
        where: { id: reservation.tierId },
        lock: { mode: 'pessimistic_write' },
      });

      if (tier) {
        if (reservation.status === ReservationStatus.HELD) {
          tier.heldSeats = Math.max(0, tier.heldSeats - reservation.quantity);
        } else if (reservation.status === ReservationStatus.CONFIRMED) {
          tier.confirmedSeats = Math.max(0, tier.confirmedSeats - reservation.quantity);
        }
        await manager.save(PackageTier, tier);
      }

      reservation.status = ReservationStatus.RELEASED;
      return manager.save(SeatReservation, reservation);
    };

    if (externalManager) {
      return execute(externalManager);
    }

    return this.dataSource.transaction(async (manager) => {
      return execute(manager);
    });
  }

  /**
   * Finds all expired reservations with status HELD and releases held seats back to the quota.
   */
  async releaseExpiredReservations(): Promise<number> {
    const now = new Date();
    const expiredReservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.status = :status', { status: ReservationStatus.HELD })
      .andWhere('reservation.expiresAt <= :now', { now })
      .getMany();

    let releasedCount = 0;
    for (const reservation of expiredReservations) {
      try {
        await this.releaseSeats(reservation.bookingId);
        releasedCount++;
      } catch {
        // Continue releasing others
      }
    }

    return releasedCount;
  }
}
