import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity.js';
import { VendorExpense } from './entities/vendor-expense.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { PaymentStatus } from '../payments/enums/payment-status.enum.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { CreateVendorExpenseDto } from './dto/create-vendor-expense.dto.js';

export interface FinancialSummaryReport {
  packageId?: string;
  totalBdtCollected: number;
  totalBdtExpenses: number;
  netMargin: number;
  currencyBreakdown: Record<string, number>;
  totalExpenseCount: number;
  totalPaymentCount: number;
}

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorsRepository: Repository<Vendor>,
    @InjectRepository(VendorExpense)
    private readonly expensesRepository: Repository<VendorExpense>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
  ) {}

  /**
   * Creates a new vendor.
   */
  async createVendor(dto: CreateVendorDto, currentAdmin: User): Promise<Vendor> {
    const vendor = this.vendorsRepository.create({
      name: dto.name,
      type: dto.type ? dto.type.toUpperCase() : 'OTHER',
      currency: dto.currency ? dto.currency.toUpperCase() : 'SAR',
      contactPerson: dto.contact_person || null,
      phone: dto.phone || null,
      email: dto.email || null,
      address: dto.address || null,
    });

    const savedVendor = await this.vendorsRepository.save(vendor);

    // Audit log
    const audit = this.auditLogsRepository.create({
      actorId: currentAdmin.id,
      action: 'VENDOR_CREATED',
      entityType: 'Vendor',
      entityId: savedVendor.id,
      oldValue: null,
      newValue: { name: savedVendor.name, currency: savedVendor.currency },
    });
    await this.auditLogsRepository.save(audit);

    return savedVendor;
  }

  /**
   * Retrieves all vendors.
   */
  async findAllVendors(): Promise<Vendor[]> {
    return this.vendorsRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Retrieves a vendor by ID with expense history.
   */
  async findVendorById(id: string): Promise<Vendor> {
    const vendor = await this.vendorsRepository.findOne({
      where: { id },
      relations: { expenses: true },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${id}" not found`);
    }

    return vendor;
  }

  /**
   * Records an operational expense with automatic BDT value calculation from exchange rate.
   */
  async recordExpense(
    dto: CreateVendorExpenseDto,
    currentAdmin: User,
  ): Promise<VendorExpense> {
    const vendor = await this.vendorsRepository.findOne({
      where: { id: dto.vendor_id },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${dto.vendor_id}" not found`);
    }

    const currency = dto.currency.toUpperCase();
    const exchangeRate = dto.exchange_rate || (currency === 'BDT' ? 1.0 : 1.0);
    const bdtValue = Math.round(dto.amount * exchangeRate);

    const expense = this.expensesRepository.create({
      vendorId: vendor.id,
      packageId: dto.package_id || null,
      description: dto.description,
      amount: dto.amount,
      currency,
      exchangeRate,
      bdtValue,
      paymentDate: dto.payment_date,
      paymentReference: dto.payment_reference || null,
      createdBy: currentAdmin.id,
    });

    const savedExpense = await this.expensesRepository.save(expense);

    // Audit Log
    const audit = this.auditLogsRepository.create({
      actorId: currentAdmin.id,
      action: 'VENDOR_EXPENSE_RECORDED',
      entityType: 'VendorExpense',
      entityId: savedExpense.id,
      oldValue: null,
      newValue: {
        vendorId: vendor.id,
        amount: dto.amount,
        currency,
        exchangeRate,
        bdtValue,
      },
    });
    await this.auditLogsRepository.save(audit);

    return savedExpense;
  }

  /**
   * Retrieves all vendor expenses with optional filters.
   */
  async findAllExpenses(
    vendorId?: string,
    packageId?: string,
    currency?: string,
  ): Promise<VendorExpense[]> {
    const where: any = {};
    if (vendorId) where.vendorId = vendorId;
    if (packageId) where.packageId = packageId;
    if (currency) where.currency = currency.toUpperCase();

    return this.expensesRepository.find({
      where,
      relations: { vendor: true, package: true },
      order: { paymentDate: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Financial Reporting: Aggregates total BDT customer collections against vendor expenses (SAR/USD/BDT),
   * calculating total BDT value, currency breakdowns, and net operational margin.
   */
  async getFinancialSummary(packageId?: string): Promise<FinancialSummaryReport> {
    // 1. Query BDT collections from successful payments
    const paymentsQuery = this.paymentsRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.booking', 'booking')
      .where('payment.status = :status', { status: PaymentStatus.SUCCESS });

    if (packageId) {
      paymentsQuery.andWhere('booking.packageId = :packageId', { packageId });
    }

    const payments = await paymentsQuery.getMany();
    const totalBdtCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    // 2. Query vendor expenses
    const expensesWhere: any = {};
    if (packageId) {
      expensesWhere.packageId = packageId;
    }
    const expenses = await this.expensesRepository.find({ where: expensesWhere });

    const totalBdtExpenses = expenses.reduce((sum, e) => sum + Number(e.bdtValue), 0);
    const netMargin = totalBdtCollected - totalBdtExpenses;

    // Currency breakdown
    const currencyBreakdown: Record<string, number> = {};
    for (const exp of expenses) {
      const curr = exp.currency;
      currencyBreakdown[curr] = (currencyBreakdown[curr] || 0) + Number(exp.amount);
    }

    return {
      packageId,
      totalBdtCollected,
      totalBdtExpenses,
      netMargin,
      currencyBreakdown,
      totalExpenseCount: expenses.length,
      totalPaymentCount: payments.length,
    };
  }
}
