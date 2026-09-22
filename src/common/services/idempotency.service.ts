import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { IdempotencyRecord } from '../entities/idempotency-record.entity.js';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly idempotencyRepository: Repository<IdempotencyRecord>,
  ) {}

  /**
   * Generates a deterministic SHA-256 hash for a given request payload.
   */
  computeHash(payload: any): string {
    const stringified = JSON.stringify(payload || {});
    return crypto.createHash('sha256').update(stringified).digest('hex');
  }

  /**
   * Checks if an operation with this idempotency key was already processed.
   * Throws 409 Conflict if key was used with a differing payload.
   */
  async check(
    endpoint: string,
    key: string,
    payload: any,
    manager?: EntityManager,
  ): Promise<{ isDuplicate: boolean; response?: any }> {
    if (!key) {
      return { isDuplicate: false };
    }

    const repo = manager
      ? manager.getRepository(IdempotencyRecord)
      : this.idempotencyRepository;

    const record = await repo.findOne({
      where: { endpoint, idempotencyKey: key },
    });

    if (!record) {
      return { isDuplicate: false };
    }

    const requestHash = this.computeHash(payload);

    if (record.requestHash && record.requestHash !== requestHash) {
      throw new ConflictException(
        `IDEMPOTENCY_CONFLICT: Idempotency key "${key}" was previously used with a different request payload`,
      );
    }

    return { isDuplicate: true, response: record.responseData };
  }

  /**
   * Stores the result of an idempotent operation.
   */
  async saveResponse(
    endpoint: string,
    key: string,
    userId: string | null,
    payload: any,
    responseData: any,
    manager?: EntityManager,
  ): Promise<IdempotencyRecord | null> {
    if (!key) {
      return null;
    }

    const repo = manager
      ? manager.getRepository(IdempotencyRecord)
      : this.idempotencyRepository;

    const requestHash = this.computeHash(payload);

    const record = repo.create({
      endpoint,
      idempotencyKey: key,
      userId,
      requestHash,
      responseData,
    });

    return repo.save(record);
  }
}
