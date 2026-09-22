import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ReconciliationRecord } from './entities/reconciliation-record.entity.js';
import { ReconciliationStatus } from './enums/reconciliation-status.enum.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { User } from '../users/entities/user.entity.js';
import { ReconcileBatchDto } from './dto/reconcile-batch.dto.js';
import { ResolveReconciliationDto } from './dto/resolve-reconciliation.dto.js';

export interface BatchReconciliationResult {
  provider: string;
  totalProcessed: number;
  matchedCount: number;
  mismatchCount: number;
  totalDifference: number;
  records: ReconciliationRecord[];
}

@Injectable()
export class ReconciliationService {
  constructor(
    @InjectRepository(ReconciliationRecord)
    private readonly recordsRepository: Repository<ReconciliationRecord>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
  ) {}

  /**
   * Reconciles a batch of gateway/bank settlement statements against internal payment records.
   * NEVER silently modifies internal payments upon discrepancy detection.
   */
  async reconcileBatch(
    dto: ReconcileBatchDto,
    currentAdmin: User,
  ): Promise<BatchReconciliationResult> {
    const normalizedProvider = dto.provider.toUpperCase();
    const records: ReconciliationRecord[] = [];

    for (const item of dto.settlements) {
      // Find internal payment matching provider and transaction ID
      const payment = await this.paymentsRepository.findOne({
        where: {
          provider: normalizedProvider,
          gatewayTransactionId: item.transaction_id,
        },
      });

      let internalAmount = 0;
      let paymentId: string | null = null;
      let notes: string | null = null;

      if (payment) {
        internalAmount = payment.amount;
        paymentId = payment.id;
      } else {
        notes = `Unmatched gateway transaction: No internal payment found for transaction ${item.transaction_id}`;
      }

      const gatewayAmount = item.amount;
      const difference = gatewayAmount - internalAmount;
      const status =
        difference === 0 && payment
          ? ReconciliationStatus.MATCHED
          : ReconciliationStatus.MISMATCH;

      const record = this.recordsRepository.create({
        provider: normalizedProvider,
        gatewayTransactionId: item.transaction_id,
        internalAmount,
        gatewayAmount,
        difference,
        status,
        paymentId,
        notes,
      });

      const savedRecord = await this.recordsRepository.save(record);
      records.push(savedRecord);
    }

    const matchedCount = records.filter(
      (r) => r.status === ReconciliationStatus.MATCHED,
    ).length;
    const mismatchCount = records.filter(
      (r) => r.status === ReconciliationStatus.MISMATCH,
    ).length;
    const totalDifference = records.reduce((sum, r) => sum + Math.abs(r.difference), 0);

    // Audit the batch reconciliation execution
    const audit = this.auditLogsRepository.create({
      actorId: currentAdmin.id,
      action: 'RECONCILIATION_BATCH_PROCESSED',
      entityType: 'ReconciliationBatch',
      entityId: currentAdmin.id,
      oldValue: null,
      newValue: {
        provider: normalizedProvider,
        totalProcessed: records.length,
        matchedCount,
        mismatchCount,
        totalDifference,
      },
    });
    await this.auditLogsRepository.save(audit);

    return {
      provider: normalizedProvider,
      totalProcessed: records.length,
      matchedCount,
      mismatchCount,
      totalDifference,
      records,
    };
  }

  /**
   * Updates status of a reconciliation record (e.g. UNDER_REVIEW or RESOLVED).
   * Generates audit log and tracks resolving actor.
   */
  async updateStatus(
    id: string,
    dto: ResolveReconciliationDto,
    currentAdmin: User,
  ): Promise<ReconciliationRecord> {
    const record = await this.recordsRepository.findOne({
      where: { id },
      relations: ['payment'],
    });

    if (!record) {
      throw new NotFoundException(`Reconciliation record with ID "${id}" not found`);
    }

    const oldStatus = record.status;
    record.status = dto.status;
    if (dto.notes) {
      record.notes = dto.notes;
    }
    record.resolvedBy = currentAdmin.id;
    record.resolvedAt = new Date();

    const savedRecord = await this.recordsRepository.save(record);

    // Write audit log
    const audit = this.auditLogsRepository.create({
      actorId: currentAdmin.id,
      action: `RECONCILIATION_STATUS_${dto.status}`,
      entityType: 'ReconciliationRecord',
      entityId: savedRecord.id,
      oldValue: { status: oldStatus },
      newValue: { status: dto.status, notes: dto.notes, resolvedBy: currentAdmin.id },
    });
    await this.auditLogsRepository.save(audit);

    return savedRecord;
  }

  /**
   * Retrieves all outstanding reconciliation discrepancies (MISMATCH and UNDER_REVIEW).
   */
  async findDiscrepancies(provider?: string): Promise<ReconciliationRecord[]> {
    const where: any = {
      status: In([ReconciliationStatus.MISMATCH, ReconciliationStatus.UNDER_REVIEW]),
    };
    if (provider) {
      where.provider = provider.toUpperCase();
    }

    return this.recordsRepository.find({
      where,
      relations: ['payment'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves all reconciliation records with optional filters.
   */
  async findAll(
    provider?: string,
    status?: ReconciliationStatus,
  ): Promise<ReconciliationRecord[]> {
    const where: any = {};
    if (provider) {
      where.provider = provider.toUpperCase();
    }
    if (status) {
      where.status = status;
    }

    return this.recordsRepository.find({
      where,
      relations: ['payment'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves a single reconciliation record by ID.
   */
  async findById(id: string): Promise<ReconciliationRecord> {
    const record = await this.recordsRepository.findOne({
      where: { id },
      relations: ['payment'],
    });

    if (!record) {
      throw new NotFoundException(`Reconciliation record with ID "${id}" not found`);
    }

    return record;
  }
}
