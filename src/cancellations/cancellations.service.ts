import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cancellation } from './entities/cancellation.entity.js';
import { CancellationPilgrim } from './entities/cancellation-pilgrim.entity.js';
import { Refund } from './entities/refund.entity.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { User } from '../users/entities/user.entity.js';
import { OwnershipValidator } from '../common/utils/ownership.util.js';

@Injectable()
export class CancellationsService {
  constructor(
    @InjectRepository(Cancellation)
    private readonly cancellationsRepository: Repository<Cancellation>,
    @InjectRepository(CancellationPilgrim)
    private readonly cancellationPilgrimsRepository: Repository<CancellationPilgrim>,
    @InjectRepository(Refund)
    private readonly refundsRepository: Repository<Refund>,
    private readonly bookingsService: BookingsService,
  ) {}

  /**
   * Retrieves all cancellations for bookings owned by the authenticated user.
   */
  async findForUser(userId: string): Promise<Cancellation[]> {
    return this.cancellationsRepository
      .createQueryBuilder('cancellation')
      .innerJoinAndSelect('cancellation.booking', 'booking')
      .leftJoinAndSelect('cancellation.pilgrims', 'pilgrims')
      .where('booking.userId = :userId', { userId })
      .orderBy('cancellation.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Retrieves cancellations for a specific booking after verifying ownership.
   */
  async findByBookingAndValidateOwnership(
    bookingId: string,
    currentUser: User,
  ): Promise<Cancellation[]> {
    await this.bookingsService.findByIdAndValidateOwnership(bookingId, currentUser);

    return this.cancellationsRepository.find({
      where: { bookingId },
      relations: ['pilgrims'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves a cancellation by ID and validates ownership via the associated booking.
   */
  async findByIdAndValidateOwnership(
    cancellationId: string,
    currentUser: User,
  ): Promise<Cancellation> {
    const cancellation = await this.cancellationsRepository.findOne({
      where: { id: cancellationId },
      relations: ['booking', 'pilgrims'],
    });

    if (!cancellation) {
      throw new NotFoundException(
        `Cancellation with ID "${cancellationId}" not found`,
      );
    }

    OwnershipValidator.validate(
      cancellation.booking.userId,
      currentUser,
      'cancellation',
    );

    return cancellation;
  }

  /**
   * Retrieves all refunds for bookings owned by the authenticated user.
   */
  async findRefundsForUser(userId: string): Promise<Refund[]> {
    return this.refundsRepository
      .createQueryBuilder('refund')
      .innerJoinAndSelect('refund.booking', 'booking')
      .where('booking.userId = :userId', { userId })
      .orderBy('refund.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Retrieves a refund by ID and validates ownership via the associated booking.
   */
  async findRefundByIdAndValidateOwnership(
    refundId: string,
    currentUser: User,
  ): Promise<Refund> {
    const refund = await this.refundsRepository.findOne({
      where: { id: refundId },
      relations: ['booking'],
    });

    if (!refund) {
      throw new NotFoundException(`Refund with ID "${refundId}" not found`);
    }

    OwnershipValidator.validate(refund.booking.userId, currentUser, 'refund');

    return refund;
  }
}
