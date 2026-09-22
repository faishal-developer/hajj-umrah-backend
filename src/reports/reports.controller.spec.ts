import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { RefundStatus } from '../cancellations/enums/refund-status.enum.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: any;

  beforeEach(async () => {
    reportsService = {
      getBookingsSummary: vi.fn(),
      getCollectionsReport: vi.fn(),
      getOutstandingInstallmentsReport: vi.fn(),
      getRefundsReport: vi.fn(),
      getSeatsReport: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: reportsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getBookingsSummary should call service.getBookingsSummary', async () => {
    const mockRes = { totalBookings: 5 };
    reportsService.getBookingsSummary.mockResolvedValue(mockRes);

    const result = await controller.getBookingsSummary('pkg-1');
    expect(reportsService.getBookingsSummary).toHaveBeenCalledWith('pkg-1');
    expect(result).toEqual(mockRes);
  });

  it('getCollectionsReport should call service.getCollectionsReport', async () => {
    const mockRes = { totalCollected: 100000 };
    reportsService.getCollectionsReport.mockResolvedValue(mockRes);

    const result = await controller.getCollectionsReport('SSLCOMMERZ');
    expect(reportsService.getCollectionsReport).toHaveBeenCalledWith('SSLCOMMERZ');
    expect(result).toEqual(mockRes);
  });

  it('getOutstandingInstallmentsReport should call service.getOutstandingInstallmentsReport', async () => {
    const mockRes = { totalOutstanding: 50000 };
    reportsService.getOutstandingInstallmentsReport.mockResolvedValue(mockRes);

    const result = await controller.getOutstandingInstallmentsReport();
    expect(reportsService.getOutstandingInstallmentsReport).toHaveBeenCalled();
    expect(result).toEqual(mockRes);
  });

  it('getRefundsReport should call service.getRefundsReport', async () => {
    const mockRes = { totalRefundCount: 2 };
    reportsService.getRefundsReport.mockResolvedValue(mockRes);

    const result = await controller.getRefundsReport(RefundStatus.APPROVED);
    expect(reportsService.getRefundsReport).toHaveBeenCalledWith(RefundStatus.APPROVED);
    expect(result).toEqual(mockRes);
  });

  it('getSeatsReport should call service.getSeatsReport', async () => {
    const mockRes = { totalSystemQuota: 100 };
    reportsService.getSeatsReport.mockResolvedValue(mockRes);

    const result = await controller.getSeatsReport('pkg-1');
    expect(reportsService.getSeatsReport).toHaveBeenCalledWith('pkg-1');
    expect(result).toEqual(mockRes);
  });
});
