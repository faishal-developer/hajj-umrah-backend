import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity.js';
import { Installment } from './entities/installment.entity.js';
import { PaymentAllocation } from './entities/payment-allocation.entity.js';
import {
  GatewayEventStatus,
  PaymentGatewayEvent,
} from './entities/payment-gateway-event.entity.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { PaymentStatus } from './enums/payment-status.enum.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { BookingStatus } from '../bookings/enums/booking-status.enum.js';
import { PaymentMode } from '../bookings/enums/payment-mode.enum.js';
import { BookingsService } from '../bookings/bookings.service.js';
import { InstallmentsService } from '../installments/installments.service.js';
import { SeatReservationService } from '../seat-reservation/seat-reservation.service.js';
import { User } from '../users/entities/user.entity.js';
import { OwnershipValidator } from '../common/utils/ownership.util.js';
import { InitiatePaymentDto } from './dto/initiate-payment.dto.js';
import { GatewayWebhookDto } from './dto/gateway-webhook.dto.js';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Installment)
    private readonly installmentsRepository: Repository<Installment>,
    @InjectRepository(PaymentAllocation)
    private readonly allocationsRepository: Repository<PaymentAllocation>,
    @InjectRepository(PaymentGatewayEvent)
    private readonly gatewayEventsRepository: Repository<PaymentGatewayEvent>,
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    private readonly bookingsService: BookingsService,
    private readonly installmentsService: InstallmentsService,
    private readonly seatReservationService: SeatReservationService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Initiates a gateway payment intent for a booking.
   * Returns a checkout session / payment URL.
   */
  async initiateGatewayPayment(
    dto: InitiatePaymentDto,
    currentUser: User,
  ): Promise<{ payment: Payment; checkoutUrl: string; transactionSessionId: string }> {
    const booking = await this.bookingsService.findByIdAndValidateOwnership(
      dto.booking_id,
      currentUser,
    );

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.EXPIRED
    ) {
      throw new BadRequestException(
        `Cannot initiate payment for booking with status "${booking.status}"`,
      );
    }

    // Calculate remaining balance
    const existingPayments = await this.paymentsRepository.find({
      where: { bookingId: booking.id, status: PaymentStatus.SUCCESS },
    });
    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = booking.totalAmount - totalPaid;

    if (dto.amount > remainingBalance) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds remaining balance (${remainingBalance})`,
      );
    }

    const providerName = dto.provider.toUpperCase();
    const payment = this.paymentsRepository.create({
      bookingId: booking.id,
      provider: providerName,
      method: dto.method ? dto.method.toUpperCase() : 'ONLINE',
      amount: dto.amount,
      currency: 'BDT',
      status: PaymentStatus.PENDING,
      createdBy: currentUser.id,
    });

    const savedPayment = await this.paymentsRepository.save(payment);

    return {
      payment: savedPayment,
      checkoutUrl: `https://checkout.${providerName.toLowerCase()}.com/pay/${savedPayment.id}`,
      transactionSessionId: savedPayment.id,
    };
  }

  /**
   * Processes verified gateway webhook event with deduplication & state transition validation.
   * NEVER trust frontend redirect; only verified webhook updates payment & booking status.
   */
  async processGatewayWebhook(
    provider: string,
    dto: GatewayWebhookDto,
  ): Promise<{ message: string; payment: Payment | null; duplicate: boolean }> {
    const normalizedProvider = provider.toUpperCase();
    const eventId = dto.event_id || `${normalizedProvider}_${dto.transaction_id}_${dto.status}`;

    // 1. Check for duplicate event by (provider, eventId)
    const existingEvent = await this.gatewayEventsRepository.findOne({
      where: {
        provider: normalizedProvider,
        eventId,
      },
    });

    if (existingEvent && existingEvent.status === GatewayEventStatus.PROCESSED) {
      const existingPayment = await this.paymentsRepository.findOne({
        where: { id: dto.payment_id },
      });
      return {
        message: 'Event already processed successfully',
        payment: existingPayment,
        duplicate: true,
      };
    }

    // 2. Find the target payment record
    const targetPayment = await this.paymentsRepository.findOne({
      where: { id: dto.payment_id },
      relations: { booking: true },
    });

    if (!targetPayment) {
      throw new NotFoundException(
        `Payment record with ID "${dto.payment_id}" not found`,
      );
    }

    // 3. Reject invalid state transitions (e.g. from SUCCESS to PENDING/FAILED)
    if (
      targetPayment.status === PaymentStatus.SUCCESS &&
      dto.status !== PaymentStatus.SUCCESS
    ) {
      const ignoredEvent = this.gatewayEventsRepository.create({
        provider: normalizedProvider,
        eventId,
        transactionId: dto.transaction_id,
        eventType: dto.event_type || 'payment.invalid_transition',
        payload: dto.metadata || (dto as any),
        status: GatewayEventStatus.IGNORED,
      });
      await this.gatewayEventsRepository.save(ignoredEvent);

      throw new BadRequestException(
        `Invalid transition: Cannot change status from SUCCESS to ${dto.status}`,
      );
    }

    if (
      targetPayment.status === PaymentStatus.FAILED &&
      dto.status === PaymentStatus.PENDING
    ) {
      throw new BadRequestException(
        `Invalid transition: Cannot change status from FAILED to ${dto.status}`,
      );
    }

    // 4. Handle FAILED status
    if (dto.status === PaymentStatus.FAILED) {
      targetPayment.status = PaymentStatus.FAILED;
      targetPayment.gatewayTransactionId = dto.transaction_id;
      const failedPayment = await this.paymentsRepository.save(targetPayment);

      const gatewayEvent = this.gatewayEventsRepository.create({
        provider: normalizedProvider,
        eventId,
        transactionId: dto.transaction_id,
        eventType: dto.event_type || 'payment.failed',
        payload: dto.metadata || (dto as any),
        status: GatewayEventStatus.PROCESSED,
      });
      await this.gatewayEventsRepository.save(gatewayEvent);

      return {
        message: 'Payment marked as failed',
        payment: failedPayment,
        duplicate: false,
      };
    }

    // 5. Execute SUCCESS state transition in a database transaction
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const paymentRepo = manager.getRepository(Payment);
      const bookingRepo = manager.getRepository(Booking);
      const eventRepo = manager.getRepository(PaymentGatewayEvent);

      const lockedPayment = await paymentRepo.findOne({
        where: { id: targetPayment.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedPayment) {
        throw new NotFoundException(`Payment with ID "${targetPayment.id}" not found`);
      }

      if (lockedPayment.status === PaymentStatus.SUCCESS) {
        return {
          message: 'Payment already processed successfully',
          payment: lockedPayment,
          duplicate: true,
        };
      }

      lockedPayment.status = PaymentStatus.SUCCESS;
      lockedPayment.gatewayTransactionId = dto.transaction_id;
      const savedPayment = await paymentRepo.save(lockedPayment);

      // Record event log in the same transaction
      const gatewayEvent = eventRepo.create({
        provider: normalizedProvider,
        eventId,
        transactionId: dto.transaction_id,
        eventType: dto.event_type || 'payment.succeeded',
        payload: dto.metadata || (dto as any),
        status: GatewayEventStatus.PROCESSED,
      });
      await eventRepo.save(gatewayEvent);

      const booking = await bookingRepo.findOne({
        where: { id: savedPayment.bookingId },
      });

      if (booking && booking.status !== BookingStatus.CANCELLED) {
        if (booking.paymentMode === PaymentMode.INSTALLMENT) {
          await this.installmentsService.allocatePayment(
            booking.id,
            savedPayment.id,
            savedPayment.amount,
            manager,
          );
        } else {
          booking.status = BookingStatus.CONFIRMED;
          await bookingRepo.save(booking);
        }

        try {
          await this.seatReservationService.confirmSeats(booking.id, manager);
        } catch {
          // Continue safely
        }
      }

      return {
        message: 'Payment processed successfully',
        payment: savedPayment,
        duplicate: false,
      };
    });
  }

  /**
   * Records a manual / branch payment request.
   */
  async recordManualPayment(
    dto: RecordManualPaymentDto,
    currentUser: User,
  ): Promise<Payment> {
    const booking = await this.bookingsRepository.findOne({
      where: { id: dto.booking_id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${dto.booking_id}" not found`);
    }

    // Check remaining balance
    const existingPayments = await this.paymentsRepository.find({
      where: { bookingId: booking.id, status: PaymentStatus.SUCCESS },
    });
    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = booking.totalAmount - totalPaid;

    if (dto.amount > remainingBalance) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds remaining balance (${remainingBalance})`,
      );
    }

    const payment = this.paymentsRepository.create({
      bookingId: booking.id,
      provider: 'MANUAL',
      method: dto.method.toUpperCase(),
      amount: dto.amount,
      currency: 'BDT',
      gatewayTransactionId: dto.reference_number || null,
      status: PaymentStatus.PENDING,
      createdBy: currentUser.id,
    });

    return this.paymentsRepository.save(payment);
  }

  /**
   * Approves a recorded manual / branch payment with Maker-Checker rule enforcement.
   * Rule: recorded_by != approved_by (creator cannot approve their own recorded payment).
   * Creates an audit log record for the approval.
   */
  async approveManualPayment(
    paymentId: string,
    currentAdmin: User,
  ): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
      relations: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${paymentId}" not found`);
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment cannot be approved because status is "${payment.status}" (must be PENDING)`,
      );
    }

    // Maker-Checker enforcement: recorded_by != approved_by
    if (payment.createdBy && payment.createdBy === currentAdmin.id) {
      throw new ForbiddenException(
        'Maker-checker violation: The user who recorded the payment cannot approve it (recorded_by != approved_by)',
      );
    }

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const paymentRepo = manager.getRepository(Payment);
      const bookingRepo = manager.getRepository(Booking);
      const auditRepo = manager.getRepository(AuditLog);

      const lockedPayment = await paymentRepo.findOne({
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedPayment) {
        throw new NotFoundException(`Payment with ID "${payment.id}" not found`);
      }

      if (lockedPayment.status !== PaymentStatus.PENDING) {
        throw new BadRequestException('Payment is no longer pending approval');
      }

      const oldStatus = lockedPayment.status;
      lockedPayment.status = PaymentStatus.SUCCESS;
      lockedPayment.approvedBy = currentAdmin.id;
      const savedPayment = await paymentRepo.save(lockedPayment);

      // Create Audit Log Record
      const auditLog = auditRepo.create({
        actorId: currentAdmin.id,
        action: 'PAYMENT_APPROVED',
        entityType: 'Payment',
        entityId: savedPayment.id,
        oldValue: { status: oldStatus, approvedBy: null },
        newValue: { status: PaymentStatus.SUCCESS, approvedBy: currentAdmin.id },
      });
      await auditRepo.save(auditLog);

      const booking = await bookingRepo.findOne({
        where: { id: savedPayment.bookingId },
      });

      if (booking && booking.status !== BookingStatus.CANCELLED) {
        if (booking.paymentMode === PaymentMode.INSTALLMENT) {
          await this.installmentsService.allocatePayment(
            booking.id,
            savedPayment.id,
            savedPayment.amount,
            manager,
          );
        } else {
          booking.status = BookingStatus.CONFIRMED;
          await bookingRepo.save(booking);
        }

        try {
          await this.seatReservationService.confirmSeats(booking.id, manager);
        } catch {
          // Continue safely
        }
      }

      return savedPayment;
    });
  }

  /**
   * Rejects a recorded manual payment with Maker-Checker rule enforcement.
   * Creates an audit log record for the rejection.
   */
  async rejectManualPayment(
    paymentId: string,
    currentAdmin: User,
    reason?: string,
  ): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${paymentId}" not found`);
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment cannot be rejected because status is "${payment.status}" (must be PENDING)`,
      );
    }

    // Maker-Checker enforcement: recorded_by != approved_by
    if (payment.createdBy && payment.createdBy === currentAdmin.id) {
      throw new ForbiddenException(
        'Maker-checker violation: The user who recorded the payment cannot reject it (recorded_by != approved_by)',
      );
    }

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const paymentRepo = manager.getRepository(Payment);
      const auditRepo = manager.getRepository(AuditLog);

      const lockedPayment = await paymentRepo.findOne({
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedPayment) {
        throw new NotFoundException(`Payment with ID "${payment.id}" not found`);
      }

      const oldStatus = lockedPayment.status;
      lockedPayment.status = PaymentStatus.FAILED;
      lockedPayment.approvedBy = currentAdmin.id;
      const savedPayment = await paymentRepo.save(lockedPayment);

      // Create Audit Log Record
      const auditLog = auditRepo.create({
        actorId: currentAdmin.id,
        action: 'PAYMENT_REJECTED',
        entityType: 'Payment',
        entityId: savedPayment.id,
        oldValue: { status: oldStatus, approvedBy: null },
        newValue: { status: PaymentStatus.FAILED, approvedBy: currentAdmin.id, reason },
      });
      await auditRepo.save(auditLog);

      return savedPayment;
    });
  }

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
    await this.bookingsService.findByIdAndValidateOwnership(bookingId, currentUser);

    return this.paymentsRepository.find({
      where: { bookingId },
      relations: { allocations: true },
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
      relations: { booking: true, allocations: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${paymentId}" not found`);
    }

    OwnershipValidator.validate(payment.booking.userId, currentUser, 'payment');

    return payment;
  }
}
