import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entities/booking.entity.js';
import { BookingStatus } from './enums/booking-status.enum.js';
import { User } from '../users/entities/user.entity.js';
import { OwnershipValidator } from '../common/utils/ownership.util.js';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  /**
   * Retrieves all bookings belonging to the authenticated user.
   * Access is derived strictly from authenticated user identity.
   */
  async findForUser(userId: string): Promise<Booking[]> {
    return this.bookingsRepository.find({
      where: { userId },
      relations: ['pilgrims', 'seatReservations'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves all bookings in the system (Admin only).
   */
  async findAll(): Promise<Booking[]> {
    return this.bookingsRepository.find({
      relations: ['pilgrims', 'seatReservations'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves a single booking by ID without ownership checks (internal).
   */
  async findById(id: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: ['pilgrims', 'seatReservations'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    return booking;
  }

  /**
   * Retrieves a booking and enforces ownership check:
   * - If USER, must be their own booking.
   * - If ADMIN, access is granted.
   * - Otherwise throws ForbiddenException.
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
   * Cancels a booking after enforcing ownership checks.
   */
  async cancelBooking(
    id: string,
    currentUser: User,
    reason?: string,
  ): Promise<Booking> {
    const booking = await this.findByIdAndValidateOwnership(id, currentUser);
    booking.status = BookingStatus.CANCELLED;
    return this.bookingsRepository.save(booking);
  }
}
