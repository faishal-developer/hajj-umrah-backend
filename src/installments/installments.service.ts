import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Installment } from '../payments/entities/installment.entity.js';
import { InstallmentStatus } from '../payments/enums/installment-status.enum.js';
import { PaymentAllocation } from '../payments/entities/payment-allocation.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { BookingStatus } from '../bookings/enums/booking-status.enum.js';
import { User } from '../users/entities/user.entity.js';
import { OwnershipValidator } from '../common/utils/ownership.util.js';

export interface AllocationResult {
  allocations: PaymentAllocation[];
  unallocatedAmount: number;
  allPaid: boolean;
}

@Injectable()
export class InstallmentsService {
  constructor(
    @InjectRepository(Installment)
    private readonly installmentsRepository: Repository<Installment>,
    @InjectRepository(PaymentAllocation)
    private readonly allocationsRepository: Repository<PaymentAllocation>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  /**
   * Generates an installment schedule for an installment-based booking.
   * Spreads amountDue evenly across installments, with remainder assigned to first installment.
   * Calculates progressive due dates and grace periods prior to departure date.
   */
  async generateSchedule(
    bookingId: string,
    totalAmount: number,
    departureDateStr: string,
    numberOfInstallments = 3,
    externalManager?: EntityManager,
  ): Promise<Installment[]> {
    const repo = externalManager
      ? externalManager.getRepository(Installment)
      : this.installmentsRepository;

    const baseAmount = Math.floor(totalAmount / numberOfInstallments);
    const remainder = totalAmount % numberOfInstallments;

    const departureDate = new Date(departureDateStr);
    const now = new Date();
    const daysUntilDeparture = Math.max(
      30,
      Math.floor((departureDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const intervalDays = Math.floor(daysUntilDeparture / (numberOfInstallments + 1));

    const installments: Installment[] = [];

    for (let seq = 1; seq <= numberOfInstallments; seq++) {
      const amountDue = seq === 1 ? baseAmount + remainder : baseAmount;

      const dueDate = new Date(now.getTime() + seq * intervalDays * 24 * 60 * 60 * 1000);
      const graceEndDate = new Date(dueDate.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days grace

      const dueDateString = dueDate.toISOString().split('T')[0];
      const graceEndDateString = graceEndDate.toISOString().split('T')[0];

      const installment = repo.create({
        bookingId,
        sequence: seq,
        amountDue,
        amountPaid: 0,
        dueDate: dueDateString,
        graceEndDate: graceEndDateString,
        status: InstallmentStatus.PENDING,
      });

      installments.push(installment);
    }

    return repo.save(installments);
  }

  /**
   * Allocates received payment to installments using OLDEST UNPAID FIRST rule.
   *
   * Example:
   * Inst 1: 50,000 remaining
   * Inst 2: 100,000 remaining
   * Payment: 80,000
   * Allocation: 50,000 -> Inst 1 (PAID), 30,000 -> Inst 2 (PARTIAL)
   */
  async allocatePayment(
    bookingId: string,
    paymentId: string,
    paymentAmount: number,
    externalManager?: EntityManager,
  ): Promise<AllocationResult> {
    const instRepo = externalManager
      ? externalManager.getRepository(Installment)
      : this.installmentsRepository;

    const allocRepo = externalManager
      ? externalManager.getRepository(PaymentAllocation)
      : this.allocationsRepository;

    const bookingRepo = externalManager
      ? externalManager.getRepository(Booking)
      : this.bookingsRepository;

    // Load unpaid or partially paid installments ordered by sequence ASC (oldest first)
    const installments = await instRepo.find({
      where: { bookingId },
      order: { sequence: 'ASC' },
    });

    let remainingPayment = paymentAmount;
    const allocations: PaymentAllocation[] = [];

    for (const inst of installments) {
      if (remainingPayment <= 0) break;
      if (inst.status === InstallmentStatus.PAID) continue;

      const remainingDue = inst.amountDue - inst.amountPaid;
      if (remainingDue <= 0) continue;

      const allocAmount = Math.min(remainingPayment, remainingDue);
      inst.amountPaid += allocAmount;
      remainingPayment -= allocAmount;

      if (inst.amountPaid >= inst.amountDue) {
        inst.status = InstallmentStatus.PAID;
      } else {
        inst.status = InstallmentStatus.PARTIAL;
      }

      await instRepo.save(inst);

      const allocation = allocRepo.create({
        paymentId,
        installmentId: inst.id,
        allocatedAmount: allocAmount,
      });

      allocations.push(await allocRepo.save(allocation));
    }

    // Check if all installments for this booking are now fully PAID
    const allPaid = installments.every(
      (inst) => inst.status === InstallmentStatus.PAID,
    );

    // Update booking status accordingly
    const booking = await bookingRepo.findOne({ where: { id: bookingId } });
    if (booking && booking.status !== BookingStatus.CANCELLED) {
      if (allPaid) {
        booking.status = BookingStatus.CONFIRMED;
      } else if (paymentAmount > 0) {
        booking.status = BookingStatus.PARTIALLY_PAID;
      }
      await bookingRepo.save(booking);
    }

    return {
      allocations,
      unallocatedAmount: remainingPayment,
      allPaid,
    };
  }

  /**
   * Retrieves installment schedule for a booking with ownership validation.
   */
  async findByBooking(
    bookingId: string,
    currentUser: User,
  ): Promise<Installment[]> {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${bookingId}" not found`);
    }

    OwnershipValidator.validate(booking.userId, currentUser, 'booking installments');

    return this.installmentsRepository.find({
      where: { bookingId },
      order: { sequence: 'ASC' },
    });
  }

  /**
   * Marks overdue installments where graceEndDate (or dueDate) has passed without full payment.
   */
  async markOverdueInstallments(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const pendingOrPartial = await this.installmentsRepository
      .createQueryBuilder('installment')
      .where('installment.status IN (:...statuses)', {
        statuses: [InstallmentStatus.PENDING, InstallmentStatus.PARTIAL],
      })
      .andWhere(
        '(installment.graceEndDate IS NOT NULL AND installment.graceEndDate < :today) OR (installment.graceEndDate IS NULL AND installment.dueDate < :today)',
        { today },
      )
      .getMany();

    for (const inst of pendingOrPartial) {
      inst.status = InstallmentStatus.OVERDUE;
      await this.installmentsRepository.save(inst);
    }

    return pendingOrPartial.length;
  }
}
