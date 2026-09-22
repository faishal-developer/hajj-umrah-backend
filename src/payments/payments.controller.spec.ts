import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { PaymentStatus } from './enums/payment-status.enum.js';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'user@example.com',
    phone: null,
    passwordHash: 'hashed',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    initiateGatewayPayment: vi.fn(),
    processGatewayWebhook: vi.fn(),
    recordManualPayment: vi.fn(),
    findForUser: vi.fn(),
    findByBookingAndValidateOwnership: vi.fn(),
    findByIdAndValidateOwnership: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('initiatePayment should invoke service.initiateGatewayPayment', async () => {
    const dto = {
      booking_id: 'b-1',
      amount: 50000,
      provider: 'BKASH',
    };
    mockService.initiateGatewayPayment.mockResolvedValue({
      payment: { id: 'p-1' },
      checkoutUrl: 'https://checkout.bkash.com/pay/p-1',
    });

    const result = await controller.initiatePayment(dto, mockUser);
    expect(mockService.initiateGatewayPayment).toHaveBeenCalledWith(dto, mockUser);
    expect(result.checkoutUrl).toBe('https://checkout.bkash.com/pay/p-1');
  });

  it('handleWebhook should invoke service.processGatewayWebhook', async () => {
    const dto = {
      transaction_id: 'TRX-100',
      payment_id: 'p-1',
      amount: 50000,
      status: PaymentStatus.SUCCESS,
    };
    mockService.processGatewayWebhook.mockResolvedValue({
      message: 'Payment processed successfully',
      duplicate: false,
    });

    const result = await controller.handleWebhook('BKASH', dto);
    expect(mockService.processGatewayWebhook).toHaveBeenCalledWith('BKASH', dto);
    expect(result.duplicate).toBe(false);
  });

  it('recordManualPayment should invoke service.recordManualPayment', async () => {
    const dto = {
      booking_id: 'b-1',
      amount: 50000,
      method: 'CASH',
    };
    mockService.recordManualPayment.mockResolvedValue({ id: 'p-manual' });

    const result = await controller.recordManualPayment(dto, mockUser);
    expect(mockService.recordManualPayment).toHaveBeenCalledWith(dto, mockUser);
    expect(result).toEqual({ id: 'p-manual' });
  });

  it('getMyPayments should derive user ID from authenticated user', async () => {
    mockService.findForUser.mockResolvedValue([]);
    await controller.getMyPayments(mockUser);
    expect(mockService.findForUser).toHaveBeenCalledWith('user-123');
  });

  it('getPayments should derive user ID from authenticated user', async () => {
    mockService.findForUser.mockResolvedValue([]);
    await controller.getPayments(mockUser);
    expect(mockService.findForUser).toHaveBeenCalledWith('user-123');
  });

  it('getPaymentsByBooking should validate booking ownership', async () => {
    mockService.findByBookingAndValidateOwnership.mockResolvedValue([]);
    await controller.getPaymentsByBooking('booking-123', mockUser);
    expect(mockService.findByBookingAndValidateOwnership).toHaveBeenCalledWith(
      'booking-123',
      mockUser,
    );
  });

  it('getPayment should validate payment ownership', async () => {
    mockService.findByIdAndValidateOwnership.mockResolvedValue({ id: 'p-1' });
    const result = await controller.getPayment('p-1', mockUser);
    expect(mockService.findByIdAndValidateOwnership).toHaveBeenCalledWith(
      'p-1',
      mockUser,
    );
    expect(result).toEqual({ id: 'p-1' });
  });
});
