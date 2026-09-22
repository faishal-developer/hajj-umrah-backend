import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { VendorsController } from './vendors.controller.js';
import { VendorsService } from './vendors.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('VendorsController', () => {
  let controller: VendorsController;
  let service: VendorsService;

  const mockAdmin: User = {
    id: 'admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    phone: null,
    passwordHash: 'hashed',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    createVendor: vi.fn(),
    findAllVendors: vi.fn(),
    findVendorById: vi.fn(),
    recordExpense: vi.fn(),
    findAllExpenses: vi.fn(),
    getFinancialSummary: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorsController],
      providers: [
        {
          provide: VendorsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VendorsController>(VendorsController);
    service = module.get<VendorsService>(VendorsService);
  });

  it('createVendor should invoke service.createVendor', async () => {
    const dto = { name: 'Saudi Airline Co', type: 'AIRLINE' };
    mockService.createVendor.mockResolvedValue({ id: 'v-1', ...dto });

    const result = await controller.createVendor(dto, mockAdmin);
    expect(mockService.createVendor).toHaveBeenCalledWith(dto, mockAdmin);
    expect(result.id).toBe('v-1');
  });

  it('getAllVendors should invoke service.findAllVendors', async () => {
    mockService.findAllVendors.mockResolvedValue([]);
    const result = await controller.getAllVendors();
    expect(mockService.findAllVendors).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('getVendorById should invoke service.findVendorById', async () => {
    mockService.findVendorById.mockResolvedValue({ id: 'v-1' });
    const result = await controller.getVendorById('v-1');
    expect(mockService.findVendorById).toHaveBeenCalledWith('v-1');
    expect(result).toEqual({ id: 'v-1' });
  });

  it('recordExpense should invoke service.recordExpense', async () => {
    const dto = {
      vendor_id: 'v-1',
      description: 'Flight bookings',
      amount: 50000,
      currency: 'SAR',
      exchange_rate: 32.5,
      payment_date: '2026-06-01',
    };
    mockService.recordExpense.mockResolvedValue({ id: 'exp-1', bdtValue: 1625000 });

    const result = await controller.recordExpense(dto, mockAdmin);
    expect(mockService.recordExpense).toHaveBeenCalledWith(dto, mockAdmin);
    expect(result.bdtValue).toBe(1625000);
  });

  it('getAllExpenses should invoke service.findAllExpenses', async () => {
    mockService.findAllExpenses.mockResolvedValue([]);
    const result = await controller.getAllExpenses('v-1', undefined, 'SAR');
    expect(mockService.findAllExpenses).toHaveBeenCalledWith('v-1', undefined, 'SAR');
    expect(result).toEqual([]);
  });

  it('getFinancialSummary should invoke service.getFinancialSummary', async () => {
    mockService.getFinancialSummary.mockResolvedValue({
      totalBdtCollected: 1000000,
      totalBdtExpenses: 500000,
      netMargin: 500000,
    });

    const result = await controller.getFinancialSummary('pkg-1');
    expect(mockService.getFinancialSummary).toHaveBeenCalledWith('pkg-1');
    expect(result.netMargin).toBe(500000);
  });
});
