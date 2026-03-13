import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, OrderItemType } from '../../generated/prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

export interface AdminDashboardRequestUser {
  id: string;
}

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

  private tenantFilter(
    _user: AdminDashboardRequestUser | undefined,
  ): Record<string, never> {
    return {};
  }

  async getWeeklyOrders(
    user?: AdminDashboardRequestUser,
  ): Promise<WeeklyOrdersResponse> {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const tf = this.tenantFilter(user);

    const items: WeeklyOrderItem[] = await Promise.all(
      days.map(async (day) => {
        const start = startOfDay(day);
        const end = endOfDay(day);
        const count = await this.prisma.order.count({
          where: {
            created_at: { gte: start, lte: end },
            ...tf,
          },
        });
        const dateStr = day.toISOString().slice(0, 10);
        return { date: dateStr, count };
      }),
    );

    return { items };
  }

  async getWeeklyRevenue(
    user?: AdminDashboardRequestUser,
  ): Promise<WeeklyRevenueResponse> {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const tf = this.tenantFilter(user);

    const items: WeeklyRevenueItem[] = await Promise.all(
      days.map(async (day) => {
        const start = startOfDay(day);
        const end = endOfDay(day);
        const result = await this.prisma.order.aggregate({
          where: {
            status: OrderStatus.completed,
            created_at: { gte: start, lte: end },
            ...tf,
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

  async getOrderStatusCounts(
    user?: AdminDashboardRequestUser,
  ): Promise<OrderStatusCountsResponse> {
    const tf = this.tenantFilter(user);
    const result = await this.prisma.order.groupBy({
      by: ['status'],
      where: Object.keys(tf).length ? tf : undefined,
      _count: { status: true },
    });

    const items: OrderStatusCountItem[] = result.map((r) => ({
      status: r.status,
      count: r._count.status,
    }));

    return { items };
  }

  /** Umumiy tushum: barcha buyurtmalar summası (barcha statuslar) */
  async getUmumiyTushum(
    user?: AdminDashboardRequestUser,
  ): Promise<{ total: number }> {
    const tf = this.tenantFilter(user);
    const r = await this.prisma.order.aggregate({
      where: tf,
      _sum: { total_amount: true },
    });
    return { total: Number(r._sum.total_amount ?? 0) };
  }

  /** Sof foyda: tugallangan buyurtmalar tushumi − ustalarga ish haqi − haydovchilarga */
  async getSofFoyda(user?: AdminDashboardRequestUser): Promise<{
    sof_foyda: number;
    tushum: number;
    ish_haqi: number;
    zapchast_tannarx: number;
    yalpi_foyda: number;
  }> {
    const tf = this.tenantFilter(user);
    const [tushumAgg, txAgg, productItems] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: OrderStatus.completed, ...tf },
        _sum: { total_amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: { in: ['master_fee', 'driver_fee'] } },
        _sum: { amount: true },
      }),
      this.prisma.orderItem.findMany({
        where: {
          item_type: OrderItemType.product,
          order: { status: OrderStatus.completed, ...tf },
        },
        include: {
          product: { select: { cost_price: true } },
        },
      }),
    ]);
    const tushum = Number(tushumAgg._sum.total_amount ?? 0);
    const ish_haqi = Number(txAgg._sum.amount ?? 0);
    const zapchast_tannarx = productItems.reduce((sum, item) => {
      const cost = item.product ? Number(item.product.cost_price) : 0;
      return sum + cost * item.quantity;
    }, 0);
    const yalpi_foyda = tushum - zapchast_tannarx;
    const sof_foyda = yalpi_foyda - ish_haqi;
    return { sof_foyda, tushum, ish_haqi, zapchast_tannarx, yalpi_foyda };
  }
}
