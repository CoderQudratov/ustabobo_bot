import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from '../../generated/prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Products where stock_count <= min_limit (column-to-column). Uses raw query. */
  async getLowStockProducts(): Promise<Product[]> {
    const rows = await this.prisma.$queryRaw<Product[]>`
      SELECT * FROM "Product"
      WHERE stock_count <= min_limit AND stock_count > 0
      ORDER BY (stock_count::float / NULLIF(min_limit, 0)) ASC
    `;
    return rows;
  }

  /** Products where stock_count <= 0. */
  async getOutOfStockProducts(): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { stock_count: { lte: 0 } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateProductDto) {
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

  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.cost_price !== undefined && { cost_price: dto.cost_price }),
        ...(dto.sale_price !== undefined && { sale_price: dto.sale_price }),
        ...(dto.stock_count !== undefined && { stock_count: dto.stock_count }),
        ...(dto.min_limit !== undefined && { min_limit: dto.min_limit }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
