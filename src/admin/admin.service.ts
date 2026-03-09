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
import type { Prisma } from '../../generated/prisma/client';
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
import { AdminStockInDto } from './dto/stock-in.dto';
import { AdminCreateOrderDto } from './dto/create-order.dto';
import { calculateOrderTotal, DELIVERY_FEE } from '../orders/price-calculator';

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
    console.log('[createUser] dto:', JSON.stringify(dto));
    try {
      const fullname = (dto.fullname ?? dto.name)?.trim();
      if (!fullname) {
        throw new BadRequestException('fullname yoki name kiritilishi shart');
      }
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
      const percent_rate = dto.percent_rate ?? dto.commission ?? 0;
      return await this.prisma.user.create({
        data: {
          fullname,
          phone: dto.phone,
          login: dto.login,
          password_hash,
          role: dto.role,
          percent_rate,
          is_active: dto.is_active ?? true,
        },
      });
    } catch (e) {
      console.error('[createUser] ERROR:', e instanceof Error ? e.message : e, e instanceof Error ? e.stack : '');
      throw e;
    }
  }

  async getUsers(
    filters: { role?: string; is_active?: boolean },
    page = 1,
    limit = 20,
  ) {
    const where: { role?: Role; is_active?: boolean } = {};
    if (filters.role) where.role = filters.role as Role;
    if (typeof filters.is_active === 'boolean')
      where.is_active = filters.is_active;

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
    if (!this.isValidUuid(id)) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
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

  async toggleUserActive(id: string, requesterId?: string) {
    if (!this.isValidUuid(id)) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (requesterId && id === requesterId) {
      throw new BadRequestException('O\'zingizni bloklashingiz mumkin emas');
    }
    if (user.role === Role.boss) {
      throw new BadRequestException('Boss rolini bloklash mumkin emas');
    }
    return this.prisma.user.update({
      where: { id },
      data: { is_active: !user.is_active },
    });
  }

  /** Prisma UUID fields throw 500 on invalid format; validate before querying. */
  private isValidUuid(s: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
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
    if (!org)
      throw new NotFoundException(`Organization with id "${id}" not found`);
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
    console.log('[createVehicle] orgId:', orgId);
    console.log('[createVehicle] dto:', JSON.stringify(dto));
    try {
      if (!this.isValidUuid(orgId)) {
        throw new NotFoundException('Tashkilot topilmadi');
      }
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
      });
      if (!org) throw new NotFoundException('Tashkilot topilmadi');
      return await this.prisma.vehicle.create({
        data: {
          org_id: orgId,
          plate_number: dto.plate_number.trim(),
          model: dto.model.trim(),
          ...(dto.year != null && { year: dto.year }),
          ...(dto.color?.trim() && { color: dto.color.trim() }),
          ...(dto.vin?.trim() && { vin: dto.vin.trim() }),
        },
      });
    } catch (e) {
      console.error('[createVehicle] ERROR:', e instanceof Error ? e.message : e, e instanceof Error ? e.stack : '');
      throw e;
    }
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
    if (!vehicle)
      throw new NotFoundException(`Vehicle with id "${id}" not found`);
    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
    });
  }

  async toggleVehicleActive(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle)
      throw new NotFoundException(`Vehicle with id "${id}" not found`);
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
    if (!service)
      throw new NotFoundException(`Service with id "${id}" not found`);
    return this.prisma.service.update({
      where: { id },
      data: dto,
    });
  }

  async deleteService(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service)
      throw new NotFoundException(`Service with id "${id}" not found`);
    await this.prisma.service.update({
      where: { id },
      data: { is_active: false },
    });
    return { deleted: true, soft: true };
  }

  async toggleServiceActive(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service)
      throw new NotFoundException(`Service with id "${id}" not found`);
    return this.prisma.service.update({
      where: { id },
      data: { is_active: !service.is_active },
    });
  }

  // ─── Products ──────────────────────────────────────────────────────────────
  async createProduct(dto: AdminCreateProductDto) {
    const salePrice = dto.sale_price ?? dto.selling_price;
    if (salePrice == null || salePrice <= 0) {
      throw new BadRequestException('sale_price yoki selling_price musbat son bo\'lishi kerak');
    }
    const product = await this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        cost_price: dto.cost_price,
        sale_price: salePrice,
        stock_count: dto.stock_count,
        min_limit: dto.min_limit ?? dto.min_stock ?? 0,
      },
    });
    await this.prisma.productPriceHistory.create({
      data: {
        product_id: product.id,
        cost_price: product.cost_price,
        sale_price: product.sale_price,
        note: 'Yaratildi',
      },
    });
    return product;
  }

  async getProducts(
    page = 1,
    limit = 50,
    opts?: { sortBy?: 'name' | 'cost_price' | 'sale_price' | 'stock_count'; sortOrder?: 'asc' | 'desc' },
  ) {
    const orderBy =
      opts?.sortBy === 'cost_price'
        ? { cost_price: opts.sortOrder ?? 'asc' }
        : opts?.sortBy === 'sale_price'
          ? { sale_price: opts.sortOrder ?? 'asc' }
          : opts?.sortBy === 'stock_count'
            ? { stock_count: opts.sortOrder ?? 'asc' }
            : { name: opts?.sortOrder ?? 'asc' };

    const where = { is_active: true };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.product.count({ where }),
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

    const [todayOrders, todayRevenue, activeOrders, lowStockResult, recentOrders] =
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
        this.prisma.order.findMany({
          take: 5,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            client_name: true,
            total_amount: true,
            status: true,
            created_at: true,
            orderItems: {
              select: {
                item_name: true,
                service: { select: { name: true } },
              },
            },
          },
        }),
      ]);

    const recent = recentOrders.map((o) => {
      const withService = o.orderItems.find(
        (i) => (i as { service?: { name: string } }).service,
      ) as { item_name: string | null; service: { name: string } } | undefined;
      const fallback = o.orderItems[0] as
        | { item_name: string | null }
        | undefined;
      const serviceName =
        withService?.service?.name ?? fallback?.item_name ?? '—';
      return {
        id: o.id,
        client_name: o.client_name,
        service_name: serviceName,
        total_amount: Number(o.total_amount),
        status: o.status,
        created_at: o.created_at,
      };
    });

    return {
      today_orders: todayOrders,
      today_revenue: Number(todayRevenue._sum.total_amount ?? 0),
      active_orders: activeOrders,
      low_stock_count: lowStockResult[0]?.count ?? 0,
      recent_orders: recent,
    };
  }

  async updateProduct(
    id: string,
    dto: AdminUpdateProductDto,
    changedByUserId?: string,
  ) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product)
      throw new NotFoundException(`Product with id "${id}" not found`);

    const priceChanged =
      (dto.cost_price != null && Number(dto.cost_price) !== Number(product.cost_price)) ||
      (dto.sale_price != null && Number(dto.sale_price) !== Number(product.sale_price));

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
    });

    if (priceChanged) {
      await this.prisma.productPriceHistory.create({
        data: {
          product_id: id,
          cost_price: updated.cost_price,
          sale_price: updated.sale_price,
          changed_by_id: changedByUserId ?? null,
          note: 'Tahrirlash',
        },
      });
    }
    return updated;
  }

  async toggleProductActive(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product)
      throw new NotFoundException(`Product with id "${id}" not found`);
    return this.prisma.product.update({
      where: { id },
      data: { is_active: !product.is_active },
    });
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product)
      throw new NotFoundException(`Product with id "${id}" not found`);
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
  }

  async stockIn(
    productId: string,
    dto: AdminStockInDto,
    changedByUserId?: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product)
      throw new NotFoundException(`Product with id "${productId}" not found`);

    const newStock = product.stock_count + dto.quantity;
    const costPrice =
      dto.price_per_unit != null ? dto.price_per_unit : Number(product.cost_price);
    const salePrice = Number(product.sale_price);

    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: productId },
        data: {
          stock_count: newStock,
          cost_price: costPrice,
        },
      }),
      this.prisma.productPriceHistory.create({
        data: {
          product_id: productId,
          cost_price: costPrice,
          sale_price: salePrice,
          changed_by_id: changedByUserId ?? null,
          note: dto.note ?? null,
        },
      }),
    ]);

    return this.prisma.product.findUnique({ where: { id: productId } });
  }

  async getProductPriceHistory(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product)
      throw new NotFoundException(`Product with id "${productId}" not found`);

    const items = await this.prisma.productPriceHistory.findMany({
      where: { product_id: productId },
      orderBy: { created_at: 'desc' },
      include: {
        changedBy: { select: { id: true, fullname: true } },
      },
    });

    return {
      items: items.map((h) => ({
        id: h.id,
        cost_price: Number(h.cost_price),
        sale_price: Number(h.sale_price),
        created_at: h.created_at,
        changed_by: h.changedBy
          ? { id: h.changedBy.id, fullname: h.changedBy.fullname }
          : null,
        note: h.note,
      })),
    };
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────
  async getOrders(
    filters: {
      status?: string;
      from?: string;
      to?: string;
      master_id?: string;
      organization_id?: string;
      search?: string;
    },
    page = 1,
    limit = 20,
  ) {
    const where: Prisma.OrderWhereInput = {};

    if (filters.status) {
      if (filters.status === 'pending') {
        where.status = {
          notIn: [OrderStatus.completed, OrderStatus.cancelled],
        };
      } else {
        where.status = filters.status as OrderStatus;
      }
    }
    if (filters.master_id) where.master_id = filters.master_id;
    if (filters.organization_id)
      where.organization_id = filters.organization_id;

    if (filters.from || filters.to) {
      where.created_at = {};
      if (filters.from) {
        const from = new Date(filters.from);
        if (Number.isNaN(from.getTime()))
          throw new BadRequestException('Invalid from');
        where.created_at.gte = from;
      }
      if (filters.to) {
        const to = new Date(filters.to);
        if (Number.isNaN(to.getTime()))
          throw new BadRequestException('Invalid to');
        to.setHours(23, 59, 59, 999);
        where.created_at.lte = to;
      }
    }

    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { client_name: { contains: q, mode: 'insensitive' } },
        { client_phone: { contains: q } },
      ];
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

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order "${orderId}" not found`);
    }
    const updateData: { status: OrderStatus; completed_at?: Date } = {
      status,
    };
    if (status === OrderStatus.completed) {
      updateData.completed_at = new Date();
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: orderInclude,
    });
  }

  async createOrder(dto: AdminCreateOrderDto) {
    const serviceIds = dto.service_ids ?? [];
    const products = dto.products ?? [];
    const manualProducts = dto.manual_products ?? [];

    if (
      serviceIds.length === 0 &&
      products.length === 0 &&
      manualProducts.length === 0
    ) {
      throw new BadRequestException(
        'Kamida bitta xizmat, mahsulot yoki qo\'lda kiritilgan mahsulot kerak',
      );
    }

    const master = await this.prisma.user.findFirst({
      where: { id: dto.master_id, role: Role.master, is_active: true },
    });
    if (!master) {
      throw new BadRequestException('Usta topilmadi');
    }

    if (dto.organization_id && dto.vehicle_id) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicle_id, org_id: dto.organization_id },
      });
      if (!vehicle) {
        throw new BadRequestException(
          'Mashina ushbu tashkilotga tegishli emas',
        );
      }
    } else if (dto.organization_id || dto.vehicle_id) {
      throw new BadRequestException(
        'organization_id va vehicle_id birga berilishi kerak',
      );
    }

    const [services, productRecords] = await Promise.all([
      serviceIds.length > 0
        ? this.prisma.service.findMany({
            where: { id: { in: serviceIds } },
          })
        : [],
      products.length > 0
        ? this.prisma.product.findMany({
            where: {
              id: { in: products.map((p) => p.product_id) },
            },
          })
        : [],
    ]);

    if (services.length !== serviceIds.length) {
      const foundIds = new Set(services.map((s) => s.id));
      const missing = serviceIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(`Xizmatlar topilmadi: ${missing.join(', ')}`);
    }
    const requiredProductIds = [...new Set(products.map((p) => p.product_id))];
    if (productRecords.length !== requiredProductIds.length) {
      const foundIds = new Set(productRecords.map((p) => p.id));
      const missing = requiredProductIds.filter((id) => !foundIds.has(id));
      if (missing.length) {
        throw new BadRequestException(`Mahsulotlar topilmadi: ${missing.join(', ')}`);
      }
    }

    const servicePriceMap = new Map<string, number>(
      services.map((s) => [s.id, Number(s.price)] as [string, number]),
    );
    const productPriceMap = new Map<string, number>(
      productRecords.map(
        (p) => [p.id, Number(p.sale_price)] as [string, number],
      ),
    );

    const itemData: Array<{
      order_id: string;
      item_type: OrderItemType;
      product_id?: string;
      service_id?: string;
      item_name?: string;
      quantity: number;
      price_at_time: number;
    }> = [];

    for (const serviceId of serviceIds) {
      const price = Number(servicePriceMap.get(serviceId) ?? 0);
      itemData.push({
        order_id: '',
        item_type: OrderItemType.service,
        service_id: serviceId,
        quantity: 1,
        price_at_time: price,
      });
    }
    for (const p of products) {
      const price = Number(productPriceMap.get(p.product_id) ?? 0);
      itemData.push({
        order_id: '',
        item_type: OrderItemType.product,
        product_id: p.product_id,
        quantity: p.quantity,
        price_at_time: price,
      });
    }
    for (const mp of manualProducts) {
      itemData.push({
        order_id: '',
        item_type: OrderItemType.manual_product,
        item_name: mp.name,
        quantity: mp.quantity,
        price_at_time: Number(mp.price),
      });
    }

    const orderItemsForTotal = itemData.map((d) => ({
      item_type: d.item_type,
      price_at_time: d.price_at_time,
      quantity: d.quantity,
    }));
    const totalAmount = calculateOrderTotal(orderItemsForTotal, dto.delivery_needed);

    const order = await this.prisma.order.create({
      data: {
        master_id: dto.master_id,
        organization_id: dto.organization_id ?? null,
        vehicle_id: dto.vehicle_id ?? null,
        client_name: dto.client_name,
        client_phone: dto.client_phone,
        car_number: dto.car_number,
        car_model: dto.car_model ?? null,
        delivery_needed: dto.delivery_needed,
        status: OrderStatus.draft,
        total_amount: totalAmount,
      },
    });

    for (const d of itemData) {
      d.order_id = order.id;
    }

    await this.prisma.orderItem.createMany({
      data: itemData.map((d) => ({
        order_id: d.order_id,
        item_type: d.item_type,
        product_id: d.product_id,
        service_id: d.service_id,
        item_name: d.item_name,
        quantity: d.quantity,
        price_at_time: Number(d.price_at_time),
      })),
    });

    return this.prisma.order.findUnique({
      where: { id: order.id },
      include: orderInclude,
    });
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException(`Order with id "${id}" not found`);
    return order;
  }

  async getVehicleByPlate(plateNumber: string) {
    const normalized = plateNumber.trim().replace(/\s+/g, ' ').toUpperCase();
    if (!normalized) {
      throw new NotFoundException('Davlat raqami kiriting');
    }
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        is_active: true,
        plate_number: { equals: normalized, mode: 'insensitive' },
      },
      include: { organization: { select: { name: true } } },
    });
    if (!vehicle) {
      throw new NotFoundException(`Mashina "${plateNumber}" topilmadi`);
    }
    return vehicle;
  }

  async getVehicleHistory(vehicleId: string, page = 1, limit = 20) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { organization: { select: { name: true } } },
    });
    if (!vehicle) {
      throw new NotFoundException('Mashina topilmadi');
    }
    const where = { vehicle_id: vehicleId };
    const [orders, total, aggregate, lastOrder] = await Promise.all([
      this.prisma.order.findMany({
        where,
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
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where: { ...where, status: 'completed' },
        _sum: { total_amount: true },
      }),
      this.prisma.order.findFirst({
        where,
        orderBy: { created_at: 'desc' },
        select: { created_at: true, completed_at: true },
      }),
    ]);

    const totalSpent = aggregate._sum.total_amount
      ? Number(aggregate._sum.total_amount)
      : 0;
    const lastServiceDate = lastOrder
      ? (lastOrder.completed_at ?? lastOrder.created_at)
      : null;

    const serviceCounts = new Map<string, number>();
    const allOrderItems = await this.prisma.orderItem.findMany({
      where: { order: { vehicle_id: vehicleId } },
      include: { service: { select: { name: true } } },
    });
    for (const item of allOrderItems) {
      if (item.service?.name) {
        serviceCounts.set(
          item.service.name,
          (serviceCounts.get(item.service.name) ?? 0) + (item.quantity || 1),
        );
      }
    }
    const mostUsedService =
      [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      vehicle: {
        id: vehicle.id,
        plate_number: vehicle.plate_number,
        model: vehicle.model,
        organization: vehicle.organization?.name ?? null,
      },
      stats: {
        total_services: total,
        total_spent: totalSpent,
        last_service_date: lastServiceDate?.toISOString() ?? null,
        most_used_service: mostUsedService,
      },
      orders,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async getAllVehicles(orgId?: string, search?: string) {
    const where: {
      org_id?: string;
      is_active: boolean;
      OR?: Array<{ plate_number?: object; model?: object }>;
    } = {
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

  async getIndividualClients(filters: {
    from?: string;
    to?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { from, to, status, search, page = 1, limit = 20 } = filters;
    const where: {
      organization_id: null;
      created_at?: { gte?: Date; lte?: Date };
      status?: OrderStatus;
      OR?: Array<{ client_name?: object; client_phone?: object }>;
    } = { organization_id: null };

    if (from || to) {
      where.created_at = {};
      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) where.created_at.gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          where.created_at.lte = d;
        }
      }
    }
    if (status) where.status = status as OrderStatus;
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { client_name: { contains: q, mode: 'insensitive' } },
        { client_phone: { contains: q } },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        client_phone: true,
        client_name: true,
        total_amount: true,
        status: true,
        created_at: true,
        completed_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const clientMap = new Map<
      string,
      {
        client_phone: string;
        client_name: string;
        total_orders: number;
        total_spent: number;
        last_activity: Date;
      }
    >();

    for (const o of orders) {
      const key = o.client_phone;
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          client_phone: o.client_phone,
          client_name: o.client_name,
          total_orders: 0,
          total_spent: 0,
          last_activity: o.completed_at
            ? new Date(o.completed_at)
            : new Date(o.created_at),
        });
      }
      const c = clientMap.get(key)!;
      c.total_orders++;
      if (o.status === 'completed') {
        c.total_spent += Number(o.total_amount);
      }
      const act = o.completed_at
        ? new Date(o.completed_at)
        : new Date(o.created_at);
      if (act > c.last_activity) c.last_activity = act;
    }

    const clients = [...clientMap.values()].sort(
      (a, b) => b.last_activity.getTime() - a.last_activity.getTime(),
    );
    const total = clients.length;
    const start = (page - 1) * limit;
    const items = clients.slice(start, start + limit);

    return {
      items: items.map((c) => ({
        client_phone: c.client_phone,
        client_name: c.client_name,
        total_orders: c.total_orders,
        total_spent: c.total_spent,
        last_activity: c.last_activity.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async getClientOrders(clientPhone: string, filters?: { from?: string; to?: string; status?: string }) {
    console.log('[getClientOrders] clientPhone (normalized):', clientPhone);
    const phoneDigits = clientPhone.replace(/\D/g, '');
    const where: {
      organization_id: null;
      client_phone: { contains: string };
      created_at?: { gte?: Date; lte?: Date };
      status?: OrderStatus;
    } = {
      organization_id: null,
      client_phone: { contains: phoneDigits.length >= 7 ? phoneDigits : clientPhone },
    };

    if (filters?.from || filters?.to) {
      where.created_at = {};
      if (filters.from) {
        const d = new Date(filters.from);
        if (!Number.isNaN(d.getTime())) where.created_at.gte = d;
      }
      if (filters.to) {
        const d = new Date(filters.to);
        if (!Number.isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          where.created_at.lte = d;
        }
      }
    }
    if (filters?.status) where.status = filters.status as OrderStatus;

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        master: { select: { fullname: true } },
        orderItems: {
          include: { service: { select: { name: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const totalSpent = orders
      .filter((o) => o.status === 'completed')
      .reduce((s, o) => s + Number(o.total_amount), 0);

    return {
      client: {
        client_phone: clientPhone,
        client_name: orders[0]?.client_name ?? '',
        total_orders: orders.length,
        total_spent: totalSpent,
      },
      orders: orders.map((o) => ({
        id: o.id,
        created_at: o.created_at,
        completed_at: o.completed_at,
        status: o.status,
        total_amount: Number(o.total_amount),
        car_number: o.car_number,
        car_model: o.car_model,
        service_name:
          (o.orderItems.find((i) => (i as { service?: { name: string } }).service) as { service: { name: string } } | undefined)
            ?.service?.name ?? '—',
      })),
    };
  }

  async getClientsHistory(query: {
    phone?: string;
    car_number?: string;
    page?: number;
    limit?: number;
  }) {
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
      {
        master_id: string;
        fullname: string;
        orders_count: number;
        total_revenue: number;
        master_fee: number;
      }
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
      {
        driver_id: string;
        fullname: string;
        deliveries_count: number;
        driver_fee: number;
      }
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

    const dailyMap = new Map<string, number>();
    for (const order of completedOrders) {
      const d = order.completed_at
        ? new Date(order.completed_at).toISOString().slice(0, 10)
        : '';
      if (!d) continue;
      dailyMap.set(d, (dailyMap.get(d) ?? 0) + Number(order.total_amount));
    }
    const daily_revenue = [...dailyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date, revenue }));

    return {
      period: { from: dateFrom, to: dateTo },
      daily_revenue,
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
