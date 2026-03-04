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
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.service.count(),
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
    await this.prisma.service.delete({ where: { id } });
    return { deleted: true };
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
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count(),
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
    const lowStock = await this.productsService.getLowStockProducts();
    return { low_stock_count: lowStock.length };
  }

  async updateProduct(id: string, dto: AdminUpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Product with id "${id}" not found`);
    return this.prisma.product.update({
      where: { id },
      data: dto,
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

  async getVehicleHistory(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, plate_number: true, model: true },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id "${vehicleId}" not found`);
    }
    const orders = await this.prisma.order.findMany({
      where: { vehicle_id: vehicleId },
      include: orderInclude,
      orderBy: { created_at: 'desc' },
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

  // ─── Reports ───────────────────────────────────────────────────────────────
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
        if (Number.isNaN(from.getTime())) throw new BadRequestException('Invalid from');
        where.completed_at.gte = from;
      }
      if (filters.to) {
        const to = new Date(filters.to);
        if (Number.isNaN(to.getTime())) throw new BadRequestException('Invalid to');
        to.setHours(23, 59, 59, 999);
        where.completed_at.lte = to;
      }
    }
    if (filters.master_id) where.master_id = filters.master_id;
    if (filters.org_id) where.organization_id = filters.org_id;

    const completedOrders = await this.prisma.order.findMany({
      where,
      include: {
        master: { select: { id: true, fullname: true, percent_rate: true } },
        driver: { select: { id: true, fullname: true, percent_rate: true } },
        organization: { select: { id: true, name: true, balance_due: true } },
        orderItems: {
          include: {
            service: { select: { name: true } },
          },
        },
      },
    });

    let totalRevenue = 0;
    const masterBreakdown: Record<string, { fullname: string; revenue: number; fee: number }> = {};
    const driverBreakdown: Record<string, { fullname: string; fee: number }> = {};
    const serviceCounts: Record<string, number> = {};

    for (const order of completedOrders) {
      const totalAmount = Number(order.total_amount);
      totalRevenue += totalAmount;

      const servicesSum = order.orderItems
        .filter((i) => i.item_type === OrderItemType.service)
        .reduce((sum, i) => sum + Number(i.price_at_time) * i.quantity, 0);
      const deliveryFee = order.delivery_needed ? DELIVERY_FEE : 0;
      const masterPercent = Number(order.master.percent_rate);
      const driverPercent = order.driver ? Number(order.driver.percent_rate) : 0;
      const masterFee = (servicesSum * masterPercent) / 100;
      const driverFee = (deliveryFee * driverPercent) / 100;

      const mid = order.master.id;
      if (!masterBreakdown[mid]) {
        masterBreakdown[mid] = { fullname: order.master.fullname, revenue: 0, fee: 0 };
      }
      masterBreakdown[mid].revenue += totalAmount;
      masterBreakdown[mid].fee += masterFee;

      if (order.driver) {
        const did = order.driver.id;
        if (!driverBreakdown[did]) {
          driverBreakdown[did] = { fullname: order.driver.fullname, fee: 0 };
        }
        driverBreakdown[did].fee += driverFee;
      }

      for (const item of order.orderItems) {
        if (item.item_type === OrderItemType.service && item.service_id) {
          const name =
            (item as { service?: { name: string } }).service?.name ??
            item.service_id;
          serviceCounts[name] = (serviceCounts[name] ?? 0) + item.quantity;
        }
      }
    }

    const totalMasterFee = Object.values(masterBreakdown).reduce((s, m) => s + m.fee, 0);
    const totalDriverFee = Object.values(driverBreakdown).reduce((s, d) => s + d.fee, 0);
    const totalBossProfit = totalRevenue - totalMasterFee - totalDriverFee;

    const orgDebts = await this.prisma.organization.findMany({
      where: { is_active: true },
      select: { id: true, name: true, balance_due: true },
    });
    const organization_debts = orgDebts.map((o) => ({
      id: o.id,
      name: o.name,
      balance_due: Number(o.balance_due),
    }));

    const top_services = Object.entries(serviceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      total_revenue: totalRevenue,
      total_boss_profit: totalBossProfit,
      per_master: Object.entries(masterBreakdown).map(([id, v]) => ({
        master_id: id,
        fullname: v.fullname,
        revenue: v.revenue,
        fee: v.fee,
      })),
      per_driver: Object.entries(driverBreakdown).map(([id, v]) => ({
        driver_id: id,
        fullname: v.fullname,
        fee: v.fee,
      })),
      organization_debts,
      top_services,
    };
  }
}
