import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { LocationDto } from './dto/location.dto';
import { OrderStatus, OrderItemType } from '../../generated/prisma/client';
import { randomUUID } from 'node:crypto';

const DELIVERY_FEE = 30_000;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}


  async createDraft(masterId: string, dto: CreateOrderDto) {
    const serviceIds = dto.service_ids ?? [];
    const products = dto.products ?? [];
    const manualProducts = dto.manual_products ?? [];

    if (
      serviceIds.length === 0 &&
      products.length === 0 &&
      manualProducts.length === 0
    ) {
      throw new BadRequestException(
        'Order must have at least one service, product, or manual product',
      );
    }

    if (dto.organization_id && dto.vehicle_id) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.vehicle_id, org_id: dto.organization_id },
      });
      if (!vehicle) {
        throw new BadRequestException(
          'Vehicle does not belong to the specified organization',
        );
      }
    } else if (dto.organization_id || dto.vehicle_id) {
      throw new BadRequestException(
        'Both organization_id and vehicle_id must be provided together or omitted',
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
      throw new BadRequestException(
        `Services not found: ${missing.join(', ')}`,
      );
    }
    const requiredProductIds = [...new Set(products.map((p) => p.product_id))];
    if (productRecords.length !== requiredProductIds.length) {
      const foundIds = new Set(productRecords.map((p) => p.id));
      const missing = requiredProductIds.filter((id) => !foundIds.has(id));
      if (missing.length) {
        throw new BadRequestException(
          `Products not found: ${missing.join(', ')}`,
        );
      }
    }

    const servicePriceMap = new Map<string, number>(
      services.map((s) => [s.id, Number(s.price)]),
    );
    const productPriceMap = new Map<string, number>(
      productRecords.map((p) => [p.id, Number(p.sale_price)]),
    );

    return this.prisma.$transaction(async (tx) => {
      const prismaTx = tx as unknown as PrismaService;
      const order = await prismaTx.order.create({
        data: {
          master_id: masterId,
          organization_id: dto.organization_id ?? null,
          vehicle_id: dto.vehicle_id ?? null,
          client_name: dto.client_name,
          client_phone: dto.client_phone,
          car_number: dto.car_number,
          car_model: dto.car_model ?? null,
          car_photo_url: dto.car_photo_url ?? null,
          delivery_needed: dto.delivery_needed,
          status: OrderStatus.draft,
          total_amount: 0,
        },
      });

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
        const price: number = servicePriceMap.get(serviceId) ?? 0;
        itemData.push({
          order_id: order.id,
          item_type: OrderItemType.service,
          service_id: serviceId,
          quantity: 1,
          price_at_time: price,
        });
      }
      for (const p of products) {
        const price: number = productPriceMap.get(p.product_id) ?? 0;
        itemData.push({
          order_id: order.id,
          item_type: OrderItemType.product,
          product_id: p.product_id,
          quantity: p.quantity,
          price_at_time: price,
        });
      }
      for (const mp of manualProducts) {
        itemData.push({
          order_id: order.id,
          item_type: OrderItemType.manual_product,
          item_name: mp.name,
          quantity: mp.quantity,
          price_at_time: mp.price,
        });
      }

      await prismaTx.orderItem.createMany({
        data: itemData.map((d) => ({
          order_id: d.order_id,
          item_type: d.item_type,
          product_id: d.product_id,
          service_id: d.service_id,
          item_name: d.item_name,
          quantity: d.quantity,
          price_at_time: d.price_at_time,
        })),
      });

      return prismaTx.order.findUnique({
        where: { id: order.id },
        include: { orderItems: true },
      });
    });
  }

  async setLocation(orderId: string, masterId: string, dto: LocationDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }
    if (order.master_id !== masterId) {
      throw new ForbiddenException('You can only update your own orders');
    }
    if (order.status !== OrderStatus.draft) {
      throw new BadRequestException(
        `Order must be in draft status. Current status: ${order.status}`,
      );
    }

    let totalAmount = order.orderItems.reduce(
      (sum, item) => sum + Number(item.price_at_time) * item.quantity,
      0,
    );
    if (order.delivery_needed) {
      totalAmount += DELIVERY_FEE;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          lat: dto.lat,
          lng: dto.lng,
          total_amount: totalAmount,
          status: OrderStatus.waiting_confirmation,
        },
      }),
      this.prisma.orderEvent.create({
        data: {
          order_id: orderId,
          actor_user_id: masterId,
          event_type: 'location_submitted',
          payload: { lat: dto.lat, lng: dto.lng, total_amount: totalAmount },
        },
      }),
    ]);
    return updated;
  }

  async confirm(orderId: string, masterId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }
    if (order.master_id !== masterId) {
      throw new ForbiddenException('You can only confirm your own orders');
    }
    if (order.status !== OrderStatus.waiting_confirmation) {
      throw new BadRequestException(
        `Order must be in waiting_confirmation status. Current status: ${order.status}`,
      );
    }

    const newStatus = order.delivery_needed
      ? OrderStatus.broadcasted
      : OrderStatus.working;

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      }),
      this.prisma.orderEvent.create({
        data: {
          order_id: orderId,
          actor_user_id: masterId,
          event_type: 'master_confirmed',
          payload: {
            previous_status: order.status,
            new_status: newStatus,
            delivery_needed: order.delivery_needed,
          },
        },
      }),
    ]);
    return updated;
  }

  async finish(orderId: string, masterId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }
    if (order.master_id !== masterId) {
      throw new ForbiddenException('You can only finish your own orders');
    }
    if (order.status !== OrderStatus.working) {
      throw new BadRequestException(
        `Order must be in working status. Current status: ${order.status}`,
      );
    }

    const confirmToken = randomUUID();

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          confirm_token: confirmToken,
          status: OrderStatus.waiting_customer_confirmation,
        },
      }),
      this.prisma.orderEvent.create({
        data: {
          order_id: orderId,
          actor_user_id: masterId,
          event_type: 'master_finished',
          payload: { confirm_token: confirmToken },
        },
      }),
    ]);

    return { confirm_token: confirmToken };
  }
}
