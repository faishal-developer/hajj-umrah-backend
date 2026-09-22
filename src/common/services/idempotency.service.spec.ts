import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service.js';
import { IdempotencyRecord } from '../entities/idempotency-record.entity.js';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let mockIdempotencyRepository: any;

  beforeEach(async () => {
    mockIdempotencyRepository = {
      findOne: vi.fn(),
      create: vi.fn().mockImplementation((dto) => dto),
      save: vi.fn().mockImplementation(async (record) => record),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: getRepositoryToken(IdempotencyRecord),
          useValue: mockIdempotencyRepository,
        },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  describe('check and saveResponse', () => {
    it('should return isDuplicate: false when key has not been used yet', async () => {
      mockIdempotencyRepository.findOne.mockResolvedValue(null);

      const result = await service.check('/bookings', 'key-123', { tier_id: 't-1' });

      expect(result.isDuplicate).toBe(false);
      expect(result.response).toBeUndefined();
    });

    it('should return isDuplicate: true and stored response when duplicate request with same payload arrives', async () => {
      const payload = { tier_id: 't-1', pilgrims: [{ name: 'Faishal' }] };
      const requestHash = service.computeHash(payload);
      const storedResponse = { id: 'booking-uuid', status: 'HELD' };

      mockIdempotencyRepository.findOne.mockResolvedValue({
        endpoint: '/bookings',
        idempotencyKey: 'key-123',
        requestHash,
        responseData: storedResponse,
      });

      const result = await service.check('/bookings', 'key-123', payload);

      expect(result.isDuplicate).toBe(true);
      expect(result.response).toEqual(storedResponse);
    });

    it('should throw 409 ConflictException when same key is used with a differing payload', async () => {
      const originalPayload = { tier_id: 't-1' };
      const originalHash = service.computeHash(originalPayload);

      mockIdempotencyRepository.findOne.mockResolvedValue({
        endpoint: '/bookings',
        idempotencyKey: 'key-123',
        requestHash: originalHash,
        responseData: { id: 'booking-uuid' },
      });

      const differentPayload = { tier_id: 't-2' }; // Different payload!

      await expect(
        service.check('/bookings', 'key-123', differentPayload),
      ).rejects.toThrow(ConflictException);
    });
  });
});
