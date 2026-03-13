import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardService } from './admin-dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;

  const mockPrisma = {
    order: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
    },
    transaction: {
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
  });

  describe('getSofFoyda', () => {
    it('should return sof_foyda = tushum - zapchast_tannarx - ish_haqi', async () => {
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total_amount: 1_000_000 },
      });
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 200_000 },
      });
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          quantity: 2,
          product: { cost_price: 50_000 },
        },
        {
          quantity: 1,
          product: { cost_price: 30_000 },
        },
      ]);

      const result = await service.getSofFoyda();

      expect(result.tushum).toBe(1_000_000);
      expect(result.ish_haqi).toBe(200_000);
      expect(result.zapchast_tannarx).toBe(2 * 50_000 + 1 * 30_000); // 130_000
      expect(result.yalpi_foyda).toBe(1_000_000 - 130_000); // 870_000
      expect(result.sof_foyda).toBe(870_000 - 200_000); // 670_000
    });

    it('should handle zero zapchast and zero ish_haqi', async () => {
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total_amount: 500_000 },
      });
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      mockPrisma.orderItem.findMany.mockResolvedValue([]);

      const result = await service.getSofFoyda();

      expect(result.tushum).toBe(500_000);
      expect(result.zapchast_tannarx).toBe(0);
      expect(result.yalpi_foyda).toBe(500_000);
      expect(result.sof_foyda).toBe(500_000);
    });

    it('should handle null _sum from aggregate', async () => {
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total_amount: null },
      });
      mockPrisma.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrisma.orderItem.findMany.mockResolvedValue([]);

      const result = await service.getSofFoyda();

      expect(result.tushum).toBe(0);
      expect(result.ish_haqi).toBe(0);
      expect(result.zapchast_tannarx).toBe(0);
      expect(result.yalpi_foyda).toBe(0);
      expect(result.sof_foyda).toBe(0);
    });
  });
});
