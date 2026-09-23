import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GatewayWebhookDto } from './gateway-webhook.dto.js';
import { PaymentStatus } from '../enums/payment-status.enum.js';

describe('GatewayWebhookDto', () => {
  it('should validate successfully when both camelCase and snake_case booking/transaction aliases are sent', async () => {
    const rawPayload = {
      event_id: 'evt_1790174309037',
      transaction_id: 'TRX-1790174309037',
      transactionId: 'TRX-1790174309037',
      status: PaymentStatus.SUCCESS,
      amount: 88000,
      booking_id: 'ae87a125-524a-4b53-a828-62bda367da98',
      bookingId: 'ae87a125-524a-4b53-a828-62bda367da98',
    };

    const dto = plainToInstance(GatewayWebhookDto, rawPayload);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.length).toBe(0);
  });

  it('should validate successfully when payment_id is provided', async () => {
    const rawPayload = {
      transaction_id: 'TRX-12345',
      payment_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      status: PaymentStatus.SUCCESS,
      amount: 50000,
    };

    const dto = plainToInstance(GatewayWebhookDto, rawPayload);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.length).toBe(0);
  });
});
