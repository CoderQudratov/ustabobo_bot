import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '../../generated/prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

export interface WeeklyOrderItem {
  date: string;
  count: number;
}

export interface WeeklyOrdersResponse {
  items: WeeklyOrderItem[];
}

export interface WeeklyRevenueItem {
  date: string;
  revenue: number;
}

export interface WeeklyRevenueResponse {
  items: WeeklyRevenueItem[];
}

export interface OrderStatusCountItem {
  status: string;
  count: number;
}

export interface OrderStatusCountsResponse {
  items: OrderStatusCountItem[];
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeeklyOrders(): Promise<WeeklyOrdersResponse> {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const items: WeeklyOrderItem[] = await Promise.all(
      days.map(async (day) => {
        const start = startOfDay(day);
        const end = endOfDay(day);
        const count = await this.prisma.order.count({
          where: {
            created_at: { gte: start, lte: end },
          },
        });
        const dateStr = day.toISOString().slice(0, 10);
        return { date: dateStr, count };
      }),
    );

    return { items };
  }

  async getWeeklyRevenue(): Promise<WeeklyRevenueResponse> {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const items: WeeklyRevenueItem[] = await Promise.all(
      days.map(async (day) => {
        const start = startOfDay(day);
        const end = endOfDay(day);
        const result = await this.prisma.order.aggregate({
          where: {
            status: OrderStatus.completed,
            created_at: { gte: start, lte: end },
          },
          _sum: { total_amount: true },
        });
        const dateStr = day.toISOString().slice(0, 10);
        const revenue = Number(result._sum.total_amount ?? 0);
        return { date: dateStr, revenue };
      }),
    );

    return { items };
  }

  async getOrderStatusCounts(): Promise<OrderStatusCountsResponse> {
    const result = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const items: OrderStatusCountItem[] = result.map((r) => ({
      status: r.status,
      count: r._count.status,
    }));

    return { items };
  }
}
