import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebappService {
  constructor(private readonly prisma: PrismaService) {}

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
