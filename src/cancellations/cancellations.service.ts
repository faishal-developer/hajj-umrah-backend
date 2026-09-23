import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Cancellation } from './entities/cancellation.entity.js';
import { CancellationPilgrim } from './entities/cancellation-pilgrim.entity.js';
import { Refund } from './entities/refund.entity.js';
import { RefundStatus } from './enums/refund-status.enum.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { PaymentStatus } from '../payments/enums/payment-status.enum.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { BookingStatus } from '../bookings/enums/booking-status.enum.js';
import { BookingPilgrim } from '../bookings/entities/booking-pilgrim.entity.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { SeatReservationService } from '../seat-reservation/seat-reservation.service.js';
import { User } from '../users/entities/user.entity.js';
import { OwnershipValidator } from '../common/utils/ownership.util.js';
import { RequestCancellationDto } from './dto/request-cancellation.dto.js';
import { ProcessRefundDto } from './dto/process-refund.dto.js';

@Injectable()
export class CancellationsService {
  constructor(
    @InjectRepository(Cancellation)
    private readonly cancellationsRepository: Repository<Cancellation>,
    @InjectRepository(CancellationPilgrim)
    private readonly cancellationPilgrimsRepository: Repository<CancellationPilgrim>,
    @InjectRepository(Refund)
    private readonly refundsRepository: Repository<Refund>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(BookingPilgrim)
    private readonly bookingPilgrimsRepository: Repository<BookingPilgrim>,
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
    private readonly bookingsService: BookingsService,
    private readonly seatReservationService: SeatReservationService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Requests full booking or individual pilgrim cancellation.
   * Calculates refund amount under strict constraint: refund <= received_payment.
   */
  async requestCancellation(
    dto: RequestCancellationDto,
    currentUser: User,
  ): Promise<{
    cancellation: Cancellation;
    refund: Refund;
    totalPaid: number;
    refundableAmount: number;
  }> {
    const booking = await this.bookingsService.findByIdAndValidateOwnership(
      dto.booking_id,
      currentUser,
    );

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    // 1. Calculate total received payment (PaymentStatus.SUCCESS)
    const successfulPayments = await this.paymentsRepository.find({
      where: { bookingId: booking.id, status: PaymentStatus.SUCCESS },
    });
    const totalPaid = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

    const cancellationFee = dto.cancellation_fee || 0;
    let refundableAmount = 0;
    const isPartial = dto.pilgrim_ids && dto.pilgrim_ids.length > 0;

    if (isPartial) {
      // Partial pilgrim cancellation
      const totalPilgrims = booking.pilgrims ? booking.pilgrims.length : 1;
      const proportion = dto.pilgrim_ids!.length / totalPilgrims;
      const maxEligible = Math.floor(totalPaid * proportion);
      refundableAmount = Math.max(0, Math.min(maxEligible - cancellationFee, maxEligible));
    } else {
      // Full booking cancellation: constraint: refund <= totalPaid
      refundableAmount = Math.max(0, Math.min(totalPaid - cancellationFee, totalPaid));
    }

    // 2. Execute persistence in a database transaction
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const cancelRepo = manager.getRepository(Cancellation);
      const cancelPilgrimRepo = manager.getRepository(CancellationPilgrim);
      const refundRepo = manager.getRepository(Refund);

      const cancellation = cancelRepo.create({
        bookingId: booking.id,
        reason: dto.reason || 'Customer requested cancellation',
        cancellationFee,
        status: 'REQUESTED',
      });
      const savedCancellation = await cancelRepo.save(cancellation);

      if (isPartial) {
        for (const pilgrimId of dto.pilgrim_ids!) {
          const cp = cancelPilgrimRepo.create({
            cancellationId: savedCancellation.id,
            pilgrimId,
          });
          await cancelPilgrimRepo.save(cp);
        }
      }

      const refund = refundRepo.create({
        bookingId: booking.id,
        amount: refundableAmount,
        status: RefundStatus.REQUESTED,
      });
      const savedRefund = await refundRepo.save(refund);

      return {
        cancellation: savedCancellation,
        refund: savedRefund,
        totalPaid,
        refundableAmount,
      };
    });
  }

  /**
   * Approves a cancellation request and its associated refund.
   * Releases reserved seats and updates booking status to CANCELLED.
   */
  async approveCancellation(
    cancellationId: string,
    currentAdmin: User,
  ): Promise<{ message: string; cancellation: Cancellation }> {
    const cancellation = await this.cancellationsRepository.findOne({
      where: { id: cancellationId },
      relations: { pilgrims: true, booking: true },
    });

    if (!cancellation) {
      throw new NotFoundException(`Cancellation with ID "${cancellationId}" not found`);
    }

    if (cancellation.status !== 'REQUESTED') {
      throw new BadRequestException(
        `Cancellation cannot be approved because status is "${cancellation.status}"`,
      );
    }

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const cancelRepo = manager.getRepository(Cancellation);
      const refundRepo = manager.getRepository(Refund);
      const bookingRepo = manager.getRepository(Booking);
      const auditRepo = manager.getRepository(AuditLog);

      cancellation.status = 'APPROVED';
      const savedCancellation = await cancelRepo.save(cancellation);

      // Approve associated refund
      const refund = await refundRepo.findOne({
        where: { bookingId: cancellation.bookingId, status: RefundStatus.REQUESTED },
      });

      if (refund) {
        refund.status = RefundStatus.APPROVED;
        refund.approvedBy = currentAdmin.id;
        await refundRepo.save(refund);
      }

      // Update Booking & Release Seats
      const isPartial = cancellation.pilgrims && cancellation.pilgrims.length > 0;
      if (!isPartial) {
        const booking = await bookingRepo.findOne({
          where: { id: cancellation.bookingId },
        });
        if (booking) {
          booking.status = BookingStatus.CANCELLED;
          await bookingRepo.save(booking);
        }

        try {
          await this.seatReservationService.releaseSeats(cancellation.bookingId, manager);
        } catch {
          // If already released, continue safely
        }
      }

      // Record Audit Log
      const audit = auditRepo.create({
        actorId: currentAdmin.id,
        action: 'CANCELLATION_APPROVED',
        entityType: 'Cancellation',
        entityId: savedCancellation.id,
        oldValue: { status: 'REQUESTED' },
        newValue: { status: 'APPROVED', approvedBy: currentAdmin.id },
      });
      await auditRepo.save(audit);

      return {
        message: 'Cancellation approved successfully',
        cancellation: savedCancellation,
      };
    });
  }

  /**
   * Rejects a cancellation request.
   */
  async rejectCancellation(
    cancellationId: string,
    currentAdmin: User,
    reason?: string,
  ): Promise<{ message: string; cancellation: Cancellation }> {
    const cancellation = await this.cancellationsRepository.findOne({
      where: { id: cancellationId },
    });

    if (!cancellation) {
      throw new NotFoundException(`Cancellation with ID "${cancellationId}" not found`);
    }

    if (cancellation.status !== 'REQUESTED') {
      throw new BadRequestException(
        `Cancellation cannot be rejected because status is "${cancellation.status}"`,
      );
    }

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const cancelRepo = manager.getRepository(Cancellation);
      const refundRepo = manager.getRepository(Refund);
      const auditRepo = manager.getRepository(AuditLog);

      cancellation.status = 'REJECTED';
      const savedCancellation = await cancelRepo.save(cancellation);

      // Reject associated refund
      const refund = await refundRepo.findOne({
        where: { bookingId: cancellation.bookingId, status: RefundStatus.REQUESTED },
      });
      if (refund) {
        refund.status = RefundStatus.REJECTED;
        refund.approvedBy = currentAdmin.id;
        await refundRepo.save(refund);
      }

      // Record Audit Log
      const audit = auditRepo.create({
        actorId: currentAdmin.id,
        action: 'CANCELLATION_REJECTED',
        entityType: 'Cancellation',
        entityId: savedCancellation.id,
        oldValue: { status: 'REQUESTED' },
        newValue: { status: 'REJECTED', approvedBy: currentAdmin.id, reason },
      });
      await auditRepo.save(audit);

      return {
        message: 'Cancellation rejected successfully',
        cancellation: savedCancellation,
      };
    });
  }

  /**
   * Processes a refund (transitioning through APPROVED -> PROCESSING -> COMPLETED or REJECTED).
   */
  async processRefund(
    refundId: string,
    dto: ProcessRefundDto,
    currentAdmin: User,
  ): Promise<Refund> {
    const refund = await this.refundsRepository.findOne({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException(`Refund with ID "${refundId}" not found`);
    }

    if (
      refund.status === RefundStatus.COMPLETED ||
      refund.status === RefundStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot change status of refund already in "${refund.status}" state`,
      );
    }

    const oldStatus = refund.status;
    refund.status = dto.status;
    refund.approvedBy = currentAdmin.id;
    const savedRefund = await this.refundsRepository.save(refund);

    // Audit Log
    const audit = this.auditLogsRepository.create({
      actorId: currentAdmin.id,
      action: `REFUND_${dto.status}`,
      entityType: 'Refund',
      entityId: savedRefund.id,
      oldValue: { status: oldStatus },
      newValue: {
        status: dto.status,
        transactionReference: dto.transaction_reference,
        reason: dto.reason,
      },
    });
    await this.auditLogsRepository.save(audit);

    return savedRefund;
  }

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
      relations: { pilgrims: true },
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
      relations: { booking: true, pilgrims: true },
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
      relations: { booking: true },
    });

    if (!refund) {
      throw new NotFoundException(`Refund with ID "${refundId}" not found`);
    }

    OwnershipValidator.validate(refund.booking.userId, currentUser, 'refund');

    return refund;
  }
}
