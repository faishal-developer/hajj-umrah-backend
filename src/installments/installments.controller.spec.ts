import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { InstallmentsController } from './installments.controller.js';
import { InstallmentsService } from './installments.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';

describe('InstallmentsController', () => {
  let controller: InstallmentsController;
  let service: InstallmentsService;

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
    findByBooking: vi.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstallmentsController],
      providers: [
        {
          provide: InstallmentsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InstallmentsController>(InstallmentsController);
    service = module.get<InstallmentsService>(InstallmentsService);
  });

  it('getInstallments should call installmentsService.findByBooking with bookingId and user', async () => {
    const result = await controller.getInstallments('booking-123', mockUser);

    expect(service.findByBooking).toHaveBeenCalledWith('booking-123', mockUser);
    expect(result).toEqual([]);
  });
});
