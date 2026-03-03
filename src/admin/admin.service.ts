import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, OrderItemType } from '../../generated/prisma/client';

const DELIVERY_FEE = 30_000;

const orderInclude = {
  master: { select: { id: true, fullname: true, phone: true, username: true } },
  driver: { select: { id: true, fullname: true, phone: true, username: true } },
  organization: { select: { id: true, name: true, balance_due: true } },
  vehicle: { select: { id: true, plate_number: true, model: true } },
  orderItems: {
    include: {
      product: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrders(filters: {
    status?: string;
    from_date?: string;
    to_date?: string;
  }) {
    const where: {
      status?: OrderStatus;
      created_at?: { gte?: Date; lte?: Date };
    } = {};

    if (filters.status) {
      where.status = filters.status as OrderStatus;
    }

    if (filters.from_date || filters.to_date) {
      where.created_at = {};
      if (filters.from_date) {
        const from = new Date(filters.from_date);
        if (Number.isNaN(from.getTime())) {
          throw new BadRequestException('Invalid from_date');
        }
        where.created_at.gte = from;
      }
      if (filters.to_date) {
        const to = new Date(filters.to_date);
        if (Number.isNaN(to.getTime())) {
          throw new BadRequestException('Invalid to_date');
        }
        to.setHours(23, 59, 59, 999);
        where.created_at.lte = to;
      }
    }

    return this.prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${id}" not found`);
    }
    return order;
  }

  async getVehicleHistory(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, plate_number: true, model: true },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id "${vehicleId}" not found`);
    }

    const orders = await this.prisma.order.findMany({
      where: { vehicle_id: vehicleId, status: OrderStatus.completed },
      include: orderInclude,
      orderBy: { completed_at: 'desc' },
    });

    return { vehicle, orders };
  }

  async getClientsHistory(query: { phone?: string; car_number?: string }) {
    const { phone, car_number } = query;
    if (!phone && !car_number) {
      throw new BadRequestException(
        'Provide at least one of phone or car_number',
      );
    }

    const where: {
      status: OrderStatus;
      client_phone?: string;
      car_number?: string;
    } = { status: OrderStatus.completed };

    if (phone) where.client_phone = phone;
    if (car_number) where.car_number = car_number;

    const orders = await this.prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { completed_at: 'desc' },
    });

    return { orders };
  }

  async getReports(filters: {
    from?: string;
    to?: string;
    master_id?: string;
    org_id?: string;
  }) {
    const where: {
      status: OrderStatus;
      completed_at?: { gte?: Date; lte?: Date };
      master_id?: string;
      organization_id?: string;
    } = { status: OrderStatus.completed };

    if (filters.from || filters.to) {
      where.completed_at = {};
      if (filters.from) {
        const from = new Date(filters.from);
        if (Number.isNaN(from.getTime())) {
          throw new BadRequestException('Invalid from date');
        }
        where.completed_at.gte = from;
      }
      if (filters.to) {
        const to = new Date(filters.to);
        if (Number.isNaN(to.getTime())) {
          throw new BadRequestException('Invalid to date');
        }
        to.setHours(23, 59, 59, 999);
        where.completed_at.lte = to;
      }
    }

    if (filters.master_id) where.master_id = filters.master_id;
    if (filters.org_id) where.organization_id = filters.org_id;

    const completedOrders = await this.prisma.order.findMany({
      where,
      include: {
        master: { select: { percent_rate: true } },
        driver: { select: { percent_rate: true } },
        orderItems: true,
      },
    });

    let totalRevenue = 0;
    let totalMasterFee = 0;
    let totalDriverFee = 0;

    for (const order of completedOrders) {
      const totalAmount = Number(order.total_amount);
      totalRevenue += totalAmount;

      const servicesSum = order.orderItems
        .filter((i) => i.item_type === OrderItemType.service)
        .reduce((sum, i) => sum + Number(i.price_at_time) * i.quantity, 0);
      const deliveryFee = order.delivery_needed ? DELIVERY_FEE : 0;
      const masterPercent = Number(order.master.percent_rate);
      const driverPercent = order.driver
        ? Number(order.driver.percent_rate)
        : 0;

      totalMasterFee += (servicesSum * masterPercent) / 100;
      totalDriverFee += (deliveryFee * driverPercent) / 100;
    }

    const totalBossProfit = totalRevenue - totalMasterFee - totalDriverFee;

    const totalDebtsResult = await this.prisma.organization.aggregate({
      _sum: { balance_due: true },
    });
    const totalDebts = Number(totalDebtsResult._sum.balance_due ?? 0);

    return {
      total_revenue: totalRevenue,
      total_boss_profit: totalBossProfit,
      total_debts: totalDebts,
    };
  }
}
