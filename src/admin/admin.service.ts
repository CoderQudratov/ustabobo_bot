import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import {
  OrderStatus,
  OrderItemType,
  Role,
  PaymentType,
} from '../../generated/prisma/client';
import { AdminCreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';
import { AdminCreateOrganizationDto } from './dto/create-organization.dto';
import { AdminUpdateOrganizationDto } from './dto/update-organization.dto';
import { AdminCreateVehicleDto } from './dto/create-vehicle.dto';
import { AdminUpdateVehicleDto } from './dto/update-vehicle.dto';
import { AdminCreateServiceDto } from './dto/create-service.dto';
import { AdminUpdateServiceDto } from './dto/update-service.dto';
import { AdminCreateProductDto } from './dto/create-product.dto';
import { AdminUpdateProductDto } from './dto/update-product.dto';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  // ─── Users ─────────────────────────────────────────────────────────────────
  async createUser(dto: AdminCreateUserDto) {
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existingPhone) {
      throw new ConflictException('User with this phone already exists');
    }
    const existingLogin = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });
    if (existingLogin) {
      throw new ConflictException('User with this login already exists');
    }
    const password_hash = await bcrypt.hash(dto.password, 10);
    const percent_rate = dto.percent_rate ?? 0;
    return this.prisma.user.create({
      data: {
        fullname: dto.fullname,
        phone: dto.phone,
        login: dto.login,
        password_hash,
        role: dto.role,
        percent_rate,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async getUsers(filters: { role?: string; is_active?: boolean }, page = 1, limit = 20) {
    const where: { role?: Role; is_active?: boolean } = {};
    if (filters.role) where.role = filters.role as Role;
    if (typeof filters.is_active === 'boolean') where.is_active = filters.is_active;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fullname: 'asc' },
        select: {
          id: true,
          fullname: true,
          phone: true,
          login: true,
          role: true,
          percent_rate: true,
          is_active: true,
          tg_id: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullname: true,
        phone: true,
        username: true,
        login: true,
        role: true,
        percent_rate: true,
        balance: true,
        is_active: true,
        tg_id: true,
      },
    });
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return user;
  }

  async updateUser(id: string, dto: AdminUpdateUserDto) {
    await this.getUserById(id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.password) {
      data.password_hash = await bcrypt.hash(dto.password, 10);
      delete (data as { password?: string }).password;
    }
    return this.prisma.user.update({
      where: { id },
      data: data as any,
    });
  }

  async toggleUserActive(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return this.prisma.user.update({
      where: { id },
      data: { is_active: !user.is_active },
    });
  }

  // ─── Organizations ─────────────────────────────────────────────────────────
  async createOrganization(dto: AdminCreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        name: dto.name,
        contact_person: dto.contact_person,
        phone: dto.phone,
        payment_type: dto.payment_type,
        balance_due: dto.balance_due ?? 0,
      },
    });
  }

  async getOrganizations(page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.organization.count(),
    ]);
    return { items, total, page, limit };
  }

  async getOrganizationById(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { vehicles: true },
    });
    if (!org) throw new NotFoundException(`Organization with id "${id}" not found`);
    return org;
  }

  async updateOrganization(id: string, dto: AdminUpdateOrganizationDto) {
    await this.getOrganizationById(id);
    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  // ─── Vehicles ───────────────────────────────────────────────────────────────
  async createVehicle(orgId: string, dto: AdminCreateVehicleDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw new NotFoundException(`Organization with id "${orgId}" not found`);
    return this.prisma.vehicle.create({
      data: {
        org_id: orgId,
        plate_number: dto.plate_number,
        model: dto.model,
      },
    });
  }

  async getVehiclesByOrg(orgId: string, page = 1, limit = 50) {
    const [items, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: { org_id: orgId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { plate_number: 'asc' },
      }),
      this.prisma.vehicle.count({ where: { org_id: orgId } }),
    ]);
    return { items, total, page, limit };
  }

  async updateVehicle(id: string, dto: AdminUpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException(`Vehicle with id "${id}" not found`);
    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
    });
  }

  async toggleVehicleActive(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException(`Vehicle with id "${id}" not found`);
    return this.prisma.vehicle.update({
      where: { id },
      data: { is_active: !vehicle.is_active },
    });
  }

  // ─── Services ───────────────────────────────────────────────────────────────
  async createService(dto: AdminCreateServiceDto) {
    return this.prisma.service.create({
      data: { name: dto.name, price: dto.price },
    });
  }

  async getServices(page = 1, limit = 50) {
    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where: { is_active: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.service.count({ where: { is_active: true } }),
    ]);
    return { items, total, page, limit };
  }

  async updateService(id: string, dto: AdminUpdateServiceDto) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException(`Service with id "${id}" not found`);
    return this.prisma.service.update({
      where: { id },
      data: dto,
    });
  }

  async deleteService(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException(`Service with id "${id}" not found`);
    await this.prisma.service.update({
      where: { id },
      data: { is_active: false },
    });
    return { deleted: true, soft: true };
  }

  async toggleServiceActive(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException(`Service with id "${id}" not found`);
    return this.prisma.service.update({
      where: { id },
      data: { is_active: !service.is_active },
    });
  }

  // ─── Products ──────────────────────────────────────────────────────────────
  async createProduct(dto: AdminCreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        cost_price: dto.cost_price,
        sale_price: dto.sale_price,
        stock_count: dto.stock_count,
        min_limit: dto.min_limit,
      },
    });
  }

  async getProducts(page = 1, limit = 50) {
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { is_active: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where: { is_active: true } }),
    ]);
    const itemsWithFlag = items.map((p) => ({
      ...p,
      is_low_stock: p.stock_count <= p.min_limit,
    }));
    return { items: itemsWithFlag, total, page, limit };
  }

  async getProductsLowStock(page = 1, limit = 50) {
    const lowStock = await this.productsService.getLowStockProducts();
    const total_low_stock_count = lowStock.length;
    const start = (page - 1) * limit;
    const products = lowStock.slice(start, start + limit).map((p) => ({
      ...p,
      is_low_stock: true,
    }));
    return { products, total_low_stock_count, page, limit };
  }

  async getDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayOrders, todayRevenue, activeOrders, lowStockResult] =
      await Promise.all([
        this.prisma.order.count({
          where: { created_at: { gte: today, lt: tomorrow } },
        }),
        this.prisma.order.aggregate({
          where: {
            status: OrderStatus.completed,
            completed_at: { gte: today, lt: tomorrow },
          },
          _sum: { total_amount: true },
        }),
        this.prisma.order.count({
          where: {
            status: { notIn: [OrderStatus.completed, OrderStatus.cancelled] },
          },
        }),
        this.prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM "Product" WHERE stock_count <= min_limit
        `,
      ]);

    return {
      today_orders: todayOrders,
      today_revenue: Number(todayRevenue._sum.total_amount ?? 0),
      active_orders: activeOrders,
      low_stock_count: lowStockResult[0]?.count ?? 0,
    };
  }

  async updateProduct(id: string, dto: AdminUpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product with id "${id}" not found`);
    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async toggleProductActive(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product with id "${id}" not found`);
    return this.prisma.product.update({
      where: { id },
      data: { is_active: !product.is_active },
    });
  }

  // ─── Orders (read-only) ────────────────────────────────────────────────────
  async getOrders(
    filters: {
      status?: string;
      from?: string;
      to?: string;
      master_id?: string;
      organization_id?: string;
    },
    page = 1,
    limit = 20,
  ) {
    const where: {
      status?: OrderStatus;
      created_at?: { gte?: Date; lte?: Date };
      master_id?: string;
      organization_id?: string;
    } = {};

    if (filters.status) where.status = filters.status as OrderStatus;
    if (filters.master_id) where.master_id = filters.master_id;
    if (filters.organization_id) where.organization_id = filters.organization_id;

    if (filters.from || filters.to) {
      where.created_at = {};
      if (filters.from) {
        const from = new Date(filters.from);
        if (Number.isNaN(from.getTime())) throw new BadRequestException('Invalid from');
        where.created_at.gte = from;
      }
      if (filters.to) {
        const to = new Date(filters.to);
        if (Number.isNaN(to.getTime())) throw new BadRequestException('Invalid to');
        to.setHours(23, 59, 59, 999);
        where.created_at.lte = to;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException(`Order with id "${id}" not found`);
    return order;
  }

  async getVehicleHistory(vehicleId: string, page = 1, limit = 20) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { organization: { select: { name: true } } },
    });
    if (!vehicle) {
      throw new NotFoundException('Mashina topilmadi');
    }
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { vehicle_id: vehicleId },
        include: {
          master: { select: { id: true, fullname: true, phone: true } },
          driver: { select: { id: true, fullname: true } },
          orderItems: {
            include: {
              product: { select: { name: true } },
              service: { select: { name: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where: { vehicle_id: vehicleId } }),
    ]);
    return {
      vehicle: {
        id: vehicle.id,
        plate_number: vehicle.plate_number,
        model: vehicle.model,
        organization: vehicle.organization?.name ?? null,
      },
      orders,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async getAllVehicles(orgId?: string, search?: string) {
    const where: { org_id?: string; is_active: boolean; OR?: Array<{ plate_number?: object; model?: object }> } = {
      is_active: true,
    };
    if (orgId) where.org_id = orgId;
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { plate_number: { contains: term, mode: 'insensitive' } },
        { model: { contains: term, mode: 'insensitive' } },
      ];
    }
    return this.prisma.vehicle.findMany({
      where,
      include: { organization: { select: { name: true } } },
      orderBy: { plate_number: 'asc' },
    });
  }

  async getClientsHistory(
    query: { phone?: string; car_number?: string; page?: number; limit?: number },
  ) {
    const { phone, car_number, page = 1, limit = 20 } = query;
    if (!phone?.trim() && !car_number?.trim()) {
      throw new BadRequestException(
        'Telefon raqami yoki mashina raqami kiriting',
      );
    }
    const where: {
      client_phone?: { contains: string };
      car_number?: { contains: string; mode: 'insensitive' };
    } = {};
    if (phone?.trim()) {
      const normalizedPhone = phone.replace(/[\s\-+()]/g, '');
      if (normalizedPhone) {
        where.client_phone = { contains: normalizedPhone };
      }
    }
    if (car_number?.trim()) {
      where.car_number = {
        contains: car_number.trim(),
        mode: 'insensitive',
      };
    }
    const [orders, total, aggregate] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          master: { select: { id: true, fullname: true } },
          driver: { select: { id: true, fullname: true } },
          organization: { select: { name: true } },
          vehicle: { select: { plate_number: true, model: true } },
          orderItems: {
            include: {
              product: { select: { name: true } },
              service: { select: { name: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where,
        _sum: { total_amount: true },
      }),
    ]);
    const totalSpent = aggregate._sum.total_amount
      ? Number(aggregate._sum.total_amount)
      : 0;
    const clientInfo =
      orders.length > 0
        ? {
            client_name: orders[0].client_name,
            client_phone: orders[0].client_phone,
            total_orders: total,
            total_spent: totalSpent,
          }
        : null;
    return {
      client: clientInfo,
      orders,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  // ─── Reports ───────────────────────────────────────────────────────────────
  async getReports(filters: {
    from: string;
    to: string;
    master_id?: string;
    org_id?: string;
  }) {
    if (!filters.from?.trim() || !filters.to?.trim()) {
      throw new BadRequestException('from and to (ISO date) are required');
    }
    const dateFrom = new Date(filters.from);
    const dateTo = new Date(filters.to);
    if (Number.isNaN(dateFrom.getTime())) {
      throw new BadRequestException('Invalid from');
    }
    if (Number.isNaN(dateTo.getTime())) {
      throw new BadRequestException('Invalid to');
    }
    dateTo.setHours(23, 59, 59, 999);

    const where: {
      status: OrderStatus;
      completed_at: { gte: Date; lte: Date };
      master_id?: string;
      organization_id?: string;
    } = {
      status: OrderStatus.completed,
      completed_at: { gte: dateFrom, lte: dateTo },
    };
    if (filters.master_id) where.master_id = filters.master_id;
    if (filters.org_id) where.organization_id = filters.org_id;

    const completedOrders = await this.prisma.order.findMany({
      where,
      include: {
        master: { select: { id: true, fullname: true } },
        driver: { select: { id: true, fullname: true } },
        organization: { select: { id: true, name: true } },
        orderItems: {
          include: {
            service: { select: { name: true } },
          },
        },
        transactions: true,
      },
    });

    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + Number(o.total_amount),
      0,
    );
    const totalOrders = completedOrders.length;

    const masterMap = new Map<
      string,
      { master_id: string; fullname: string; orders_count: number; total_revenue: number; master_fee: number }
    >();
    for (const order of completedOrders) {
      const key = order.master_id;
      if (!masterMap.has(key)) {
        masterMap.set(key, {
          master_id: key,
          fullname: order.master.fullname,
          orders_count: 0,
          total_revenue: 0,
          master_fee: 0,
        });
      }
      const m = masterMap.get(key)!;
      m.orders_count++;
      m.total_revenue += Number(order.total_amount);
      m.master_fee += order.transactions
        .filter((t) => t.type === 'master_fee')
        .reduce((s, t) => s + Number(t.amount), 0);
    }

    const driverMap = new Map<
      string,
      { driver_id: string; fullname: string; deliveries_count: number; driver_fee: number }
    >();
    for (const order of completedOrders) {
      if (!order.driver_id) continue;
      const key = order.driver_id;
      if (!driverMap.has(key)) {
        driverMap.set(key, {
          driver_id: key,
          fullname: order.driver?.fullname ?? '',
          deliveries_count: 0,
          driver_fee: 0,
        });
      }
      const d = driverMap.get(key)!;
      d.deliveries_count++;
      d.driver_fee += order.transactions
        .filter((t) => t.type === 'driver_fee')
        .reduce((s, t) => s + Number(t.amount), 0);
    }

    const orgDebts = await this.prisma.organization.findMany({
      where: { balance_due: { gt: 0 } },
      select: { id: true, name: true, balance_due: true, phone: true },
      orderBy: { balance_due: 'desc' },
    });
    const organization_debts = orgDebts.map((o) => ({
      id: o.id,
      name: o.name,
      balance_due: Number(o.balance_due),
      phone: o.phone,
    }));

    const serviceStats: Record<
      string,
      { name: string; count: number; revenue: number }
    > = {};
    for (const order of completedOrders) {
      for (const item of order.orderItems) {
        if (item.item_type !== OrderItemType.service) continue;
        const name =
          (item as { service?: { name: string } }).service?.name ??
          item.item_name ??
          item.service_id ??
          'Unknown';
        if (!serviceStats[name]) {
          serviceStats[name] = { name, count: 0, revenue: 0 };
        }
        serviceStats[name].count += item.quantity;
        serviceStats[name].revenue +=
          Number(item.price_at_time) * item.quantity;
      }
    }

    const totalMasterFees = [...masterMap.values()].reduce(
      (s, m) => s + m.master_fee,
      0,
    );
    const totalDriverFees = [...driverMap.values()].reduce(
      (s, d) => s + d.driver_fee,
      0,
    );

    const top_services = Object.values(serviceStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      period: { from: dateFrom, to: dateTo },
      summary: {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        total_master_fees: totalMasterFees,
        total_driver_fees: totalDriverFees,
        boss_profit: totalRevenue - totalMasterFees - totalDriverFees,
      },
      master_breakdown: [...masterMap.values()],
      driver_breakdown: [...driverMap.values()],
      organization_debts,
      top_services,
    };
  }
}
