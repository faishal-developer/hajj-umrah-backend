import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity.js';
import { BookingStatus } from '../bookings/enums/booking-status.enum.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { PaymentStatus } from '../payments/enums/payment-status.enum.js';
import { Installment } from '../payments/entities/installment.entity.js';
import { InstallmentStatus } from '../payments/enums/installment-status.enum.js';
import { Refund } from '../cancellations/entities/refund.entity.js';
import { RefundStatus } from '../cancellations/enums/refund-status.enum.js';
import { PackageTier } from '../packages/entities/package-tier.entity.js';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Installment)
    private readonly installmentsRepository: Repository<Installment>,
    @InjectRepository(Refund)
    private readonly refundsRepository: Repository<Refund>,
    @InjectRepository(PackageTier)
    private readonly tiersRepository: Repository<PackageTier>,
  ) {}

  /**
   * Generates summary metrics of bookings by status, total pilgrims, and gross booked value.
   */
  async getBookingsSummary(packageId?: string) {
    const query = this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.pilgrims', 'pilgrims');

    if (packageId) {
      query.where('booking.packageId = :packageId', { packageId });
    }

    const bookings = await query.getMany();

    const statusCounts: Record<string, number> = {
      [BookingStatus.HELD]: 0,
      [BookingStatus.PENDING_PAYMENT]: 0,
      [BookingStatus.CONFIRMED]: 0,
      [BookingStatus.PARTIALLY_PAID]: 0,
      [BookingStatus.CANCELLED]: 0,
      [BookingStatus.DEFAULTED]: 0,
      [BookingStatus.EXPIRED]: 0,
    };

    let totalPilgrims = 0;
    let totalBookedValue = 0;

    for (const b of bookings) {
      if (statusCounts[b.status] !== undefined) {
        statusCounts[b.status]++;
      }
      totalPilgrims += b.pilgrims ? b.pilgrims.length : 0;
      if (b.status !== BookingStatus.CANCELLED) {
        totalBookedValue += b.totalAmount;
      }
    }

    return {
      totalBookings: bookings.length,
      totalPilgrims,
      totalBookedValue,
      statusCounts,
    };
  }

  /**
   * Generates collections report detailing revenue collected across providers and payment methods.
   */
  async getCollectionsReport(provider?: string) {
    const query = this.paymentsRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.SUCCESS });

    if (provider) {
      query.andWhere('payment.provider = :provider', {
        provider: provider.toUpperCase(),
      });
    }

    const payments = await query.getMany();

    let totalCollected = 0;
    let gatewayCollected = 0;
    let manualCollected = 0;
    const providerBreakdown: Record<string, number> = {};
    const methodBreakdown: Record<string, number> = {};

    for (const p of payments) {
      totalCollected += p.amount;
      if (p.provider === 'MANUAL') {
        manualCollected += p.amount;
      } else {
        gatewayCollected += p.amount;
      }

      providerBreakdown[p.provider] =
        (providerBreakdown[p.provider] || 0) + p.amount;
      methodBreakdown[p.method] =
        (methodBreakdown[p.method] || 0) + p.amount;
    }

    return {
      totalCollected,
      gatewayCollected,
      manualCollected,
      totalTransactions: payments.length,
      providerBreakdown,
      methodBreakdown,
    };
  }

  /**
   * Generates report of outstanding and overdue installment balances.
   */
  async getOutstandingInstallmentsReport() {
    const installments = await this.installmentsRepository
      .createQueryBuilder('installment')
      .innerJoinAndSelect('installment.booking', 'booking')
      .where('installment.status IN (:...statuses)', {
        statuses: [
          InstallmentStatus.PENDING,
          InstallmentStatus.PARTIAL,
          InstallmentStatus.OVERDUE,
        ],
      })
      .orderBy('installment.dueDate', 'ASC')
      .getMany();

    let totalOutstanding = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    let pendingCount = 0;
    let partialCount = 0;

    for (const inst of installments) {
      const unpaid = inst.amountDue - inst.amountPaid;
      totalOutstanding += unpaid;

      if (inst.status === InstallmentStatus.OVERDUE) {
        overdueCount++;
        totalOverdue += unpaid;
      } else if (inst.status === InstallmentStatus.PARTIAL) {
        partialCount++;
      } else {
        pendingCount++;
      }
    }

    return {
      totalOutstanding,
      totalOverdue,
      overdueCount,
      pendingCount,
      partialCount,
      totalUnpaidInstallments: installments.length,
    };
  }

  /**
   * Generates refund report metrics.
   */
  async getRefundsReport(status?: RefundStatus) {
    const query = this.refundsRepository.createQueryBuilder('refund');

    if (status) {
      query.where('refund.status = :status', { status });
    }

    const refunds = await query.getMany();

    let totalRequestedAmount = 0;
    let totalApprovedAmount = 0;
    let totalCompletedAmount = 0;
    const statusCounts: Record<string, number> = {
      [RefundStatus.REQUESTED]: 0,
      [RefundStatus.APPROVED]: 0,
      [RefundStatus.PROCESSING]: 0,
      [RefundStatus.COMPLETED]: 0,
      [RefundStatus.REJECTED]: 0,
    };

    for (const r of refunds) {
      if (statusCounts[r.status] !== undefined) {
        statusCounts[r.status]++;
      }
      if (r.status === RefundStatus.REQUESTED) totalRequestedAmount += r.amount;
      if (r.status === RefundStatus.APPROVED) totalApprovedAmount += r.amount;
      if (r.status === RefundStatus.COMPLETED) totalCompletedAmount += r.amount;
    }

    return {
      totalRefundCount: refunds.length,
      totalRequestedAmount,
      totalApprovedAmount,
      totalCompletedAmount,
      statusCounts,
    };
  }

  /**
   * Generates seat capacity and quota occupancy metrics per package tier.
   */
  async getSeatsReport(packageId?: string) {
    const query = this.tiersRepository
      .createQueryBuilder('tier')
      .innerJoinAndSelect('tier.package', 'package');

    if (packageId) {
      query.where('tier.packageId = :packageId', { packageId });
    }

    const tiers = await query.getMany();

    let totalSystemQuota = 0;
    let totalHeldSeats = 0;
    let totalConfirmedSeats = 0;

    const tierBreakdown = tiers.map((tier) => {
      const activeSeats = tier.heldSeats + tier.confirmedSeats;
      const availableSeats = Math.max(0, tier.quota - activeSeats);
      const occupancyRate =
        tier.quota > 0
          ? Number(((activeSeats / tier.quota) * 100).toFixed(2))
          : 0;

      totalSystemQuota += tier.quota;
      totalHeldSeats += tier.heldSeats;
      totalConfirmedSeats += tier.confirmedSeats;

      return {
        tierId: tier.id,
        tierName: tier.name,
        packageName: tier.package ? tier.package.name : 'Unknown',
        quota: tier.quota,
        heldSeats: tier.heldSeats,
        confirmedSeats: tier.confirmedSeats,
        availableSeats,
        occupancyRate,
      };
    });

    const totalOccupied = totalHeldSeats + totalConfirmedSeats;
    const totalAvailable = Math.max(0, totalSystemQuota - totalOccupied);
    const systemOccupancyRate =
      totalSystemQuota > 0
        ? Number(((totalOccupied / totalSystemQuota) * 100).toFixed(2))
        : 0;

    return {
      totalSystemQuota,
      totalHeldSeats,
      totalConfirmedSeats,
      totalAvailable,
      systemOccupancyRate,
      tierBreakdown,
    };
  }
}
