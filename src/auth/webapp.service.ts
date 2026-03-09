import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebappService {
  constructor(private readonly prisma: PrismaService) {}

  /** Search services for webapp new order. sortBy=usage = most used first. */
  async searchServices(opts: {
    search?: string;
    limit: number;
    sortBy?: 'usage';
  }) {
    const limit = Math.min(Math.max(1, opts.limit || 5), 20);
    const where = { is_active: true };
    const search = opts.search?.trim();
    const nameFilter =
      search && search.length > 0
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {};
    const whereWithSearch = { ...where, ...nameFilter };

    if (opts.sortBy === 'usage') {
      const list = await this.prisma.service.findMany({
        where: whereWithSearch,
        take: limit,
        orderBy: [{ orderItems: { _count: 'desc' } }, { name: 'asc' }],
        select: { id: true, name: true, price: true },
      });
      return list.map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
      }));
    }

    const list = await this.prisma.service.findMany({
      where: whereWithSearch,
      take: limit,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, price: true },
    });
    return list.map((s) => ({
      id: s.id,
      name: s.name,
      price: Number(s.price),
    }));
  }

  /** Search products for webapp new order. sortBy=usage = most sold first. */
  async searchProducts(opts: {
    search?: string;
    limit: number;
    sortBy?: 'usage';
  }) {
    const limit = Math.min(Math.max(1, opts.limit || 5), 20);
    const where = { is_active: true };
    const search = opts.search?.trim();
    const nameFilter =
      search && search.length > 0
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {};
    const whereWithSearch = { ...where, ...nameFilter };

    if (opts.sortBy === 'usage') {
      const list = await this.prisma.product.findMany({
        where: whereWithSearch,
        take: limit,
        orderBy: [{ orderItems: { _count: 'desc' } }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          sale_price: true,
          stock_count: true,
        },
      });
      return list.map((p) => ({
        id: p.id,
        name: p.name,
        sale_price: Number(p.sale_price),
        stock_count: p.stock_count,
      }));
    }

    const list = await this.prisma.product.findMany({
      where: whereWithSearch,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        sale_price: true,
        stock_count: true,
      },
    });
    return list.map((p) => ({
      id: p.id,
      name: p.name,
      sale_price: Number(p.sale_price),
      stock_count: p.stock_count,
    }));
  }

  /** List vehicles of an organization (for webapp order form). */
  async getOrgVehicles(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId, is_active: true },
    });
    if (!org) throw new NotFoundException('Tashkilot topilmadi');
    const items = await this.prisma.vehicle.findMany({
      where: { org_id: orgId, is_active: true },
      orderBy: { plate_number: 'asc' },
      select: {
        id: true,
        org_id: true,
        plate_number: true,
        model: true,
        year: true,
        color: true,
      },
    });
    return items.map((v) => ({
      id: v.id,
      org_id: v.org_id,
      plate_number: v.plate_number,
      model: v.model,
      year: v.year ?? undefined,
      color: v.color ?? undefined,
    }));
  }

  /** Create vehicle for organization (for webapp "Yangi mashina qo'sh"). */
  async createOrgVehicle(
    orgId: string,
    dto: { plate_number: string; model: string; year?: number; color?: string },
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw new NotFoundException('Tashkilot topilmadi');
    const created = await this.prisma.vehicle.create({
      data: {
        org_id: orgId,
        plate_number: dto.plate_number.trim(),
        model: dto.model.trim(),
        ...(dto.year != null && { year: dto.year }),
        ...(dto.color?.trim() && { color: dto.color.trim() }),
      },
    });
    return {
      id: created.id,
      org_id: created.org_id,
      plate_number: created.plate_number,
      model: created.model,
      year: created.year ?? undefined,
      color: created.color ?? undefined,
    };
  }

  async getInitData() {
    const [services, products, organizations, vehicles] = await Promise.all([
      this.prisma.service.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, price: true },
      }),
      this.prisma.product.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          sale_price: true,
          stock_count: true,
        },
      }),
      this.prisma.organization.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.vehicle.findMany({
        where: { is_active: true },
        orderBy: [{ org_id: 'asc' }, { plate_number: 'asc' }],
        select: {
          id: true,
          org_id: true,
          plate_number: true,
          model: true,
        },
      }),
    ]);
    return {
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
      })),
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        sale_price: Number(p.sale_price),
        stock_count: p.stock_count,
      })),
      organizations,
      vehicles: vehicles.map((v) => ({
        id: v.id,
        org_id: v.org_id,
        plate_number: v.plate_number,
        model: v.model,
      })),
    };
  }
}
