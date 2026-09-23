import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBookingDto } from './create-booking.dto.js';
import { PaymentMode } from '../enums/payment-mode.enum.js';

describe('CreateBookingDto Validation', () => {
  it('should successfully validate exact frontend payload with camelCase keys and packageId', async () => {
    const rawPayload = {
      packageId: 'ff9cec36-4876-4eda-b5d0-7ab43ed00119',
      tierId: '40fea67e-19ef-4695-8568-7c746a3cdcec',
      paymentMode: 'INSTALLMENT',
      pilgrims: [
        {
          fullName: 'md faishal 8288',
          passportNumber: '121212',
          nationality: 'Bangladesh',
        },
      ],
    };

    const dto = plainToInstance(CreateBookingDto, rawPayload);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.tierId).toBe('40fea67e-19ef-4695-8568-7c746a3cdcec');
    expect(dto.paymentMode).toBe(PaymentMode.INSTALLMENT);
    expect(dto.pilgrims[0].fullName).toBe('md faishal 8288');
    expect(dto.pilgrims[0].passportNumber).toBe('121212');
  });

  it('should successfully validate traditional snake_case payload', async () => {
    const rawPayload = {
      tier_id: '40fea67e-19ef-4695-8568-7c746a3cdcec',
      payment_mode: 'FULL',
      pilgrims: [
        {
          name: 'Abdullah Khan',
          passport_number: 'A12345678',
          nationality: 'Bangladeshi',
          date_of_birth: '1985-06-15',
          passport_expiry: '2030-01-01',
        },
      ],
    };

    const dto = plainToInstance(CreateBookingDto, rawPayload);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
  });

  it('should fail validation when neither tier_id nor tierId is provided', async () => {
    const rawPayload = {
      paymentMode: 'INSTALLMENT',
      pilgrims: [
        {
          fullName: 'Faishal',
          passportNumber: '121212',
        },
      ],
    };

    const dto = plainToInstance(CreateBookingDto, rawPayload);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.length).toBeGreaterThan(0);
    const tierError = errors.find((e) => e.property === 'tier_id' || e.property === 'tierId');
    expect(tierError).toBeDefined();
  });

  it('should fail validation when neither payment_mode nor paymentMode is provided', async () => {
    const rawPayload = {
      tierId: '40fea67e-19ef-4695-8568-7c746a3cdcec',
      pilgrims: [
        {
          fullName: 'Faishal',
          passportNumber: '121212',
        },
      ],
    };

    const dto = plainToInstance(CreateBookingDto, rawPayload);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.length).toBeGreaterThan(0);
    const modeError = errors.find((e) => e.property === 'payment_mode' || e.property === 'paymentMode');
    expect(modeError).toBeDefined();
  });

  it('should fail validation when pilgrims array is empty', async () => {
    const rawPayload = {
      tierId: '40fea67e-19ef-4695-8568-7c746a3cdcec',
      paymentMode: 'FULL',
      pilgrims: [],
    };

    const dto = plainToInstance(CreateBookingDto, rawPayload);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.length).toBeGreaterThan(0);
    const pilgrimError = errors.find((e) => e.property === 'pilgrims');
    expect(pilgrimError).toBeDefined();
  });
});
