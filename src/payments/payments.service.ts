import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity.js';
import { Installment } from './entities/installment.entity.js';
import { PaymentAllocation } from './entities/payment-allocation.entity.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { User } from '../users/entities/user.entity.js';
import { OwnershipValidator } from '../common/utils/ownership.util.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Installment)
    private readonly installmentsRepository: Repository<Installment>,
    @InjectRepository(PaymentAllocation)
    private readonly allocationsRepository: Repository<PaymentAllocation>,
    private readonly bookingsService: BookingsService,
  ) {}

  /**
   * Retrieves all payments for the authenticated user.
   */
  async findForUser(userId: string): Promise<Payment[]> {
    return this.paymentsRepository
      .createQueryBuilder('payment')
      .innerJoinAndSelect('payment.booking', 'booking')
      .leftJoinAndSelect('payment.allocations', 'allocations')
      .where('booking.userId = :userId', { userId })
      .orderBy('payment.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Retrieves all payments for a specific booking after verifying ownership.
   */
  async findByBookingAndValidateOwnership(
    bookingId: string,
    currentUser: User,
  ): Promise<Payment[]> {
    // Validates that the current user owns the booking or is ADMIN
    await this.bookingsService.findByIdAndValidateOwnership(bookingId, currentUser);

    return this.paymentsRepository.find({
      where: { bookingId },
      relations: ['allocations'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves a specific payment by ID and verifies ownership via the associated booking.
   */
  async findByIdAndValidateOwnership(
    paymentId: string,
    currentUser: User,
  ): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: ['booking', 'allocations'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${paymentId}" not found`);
    }

    // Validate ownership against the associated booking
    OwnershipValidator.validate(payment.booking.userId, currentUser, 'payment');

    return payment;
  }
}
