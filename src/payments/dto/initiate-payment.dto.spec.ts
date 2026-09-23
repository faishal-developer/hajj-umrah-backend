import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { InitiatePaymentDto } from './initiate-payment.dto.js';

describe('InitiatePaymentDto Validation', () => {
  it('should successfully validate payload with camelCase bookingId', async () => {
    const rawPayload = {
      bookingId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      amount: 50000,
      provider: 'SSLCOMMERZ',
    };

    const dto = plainToInstance(InitiatePaymentDto, rawPayload);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.bookingId).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  });

  it('should successfully validate payload with snake_case booking_id', async () => {
    const rawPayload = {
      booking_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      amount: 50000,
      provider: 'SSLCOMMERZ',
    };

    const dto = plainToInstance(InitiatePaymentDto, rawPayload);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.booking_id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  });
});
