import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BroadcastProducer } from '../broadcast/broadcast-producer.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { LocationDto } from './dto/location.dto';
import { OrderStatus, OrderItemType } from '../../generated/prisma/client';
import { randomUUID } from 'node:crypto';
const DELIVERY_FEE = 30_000;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcastProducer: BroadcastProducer,
  ) {}


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

    if (order.delivery_needed && newStatus === OrderStatus.broadcasted) {
      this.broadcastProducer.broadcastOrder(orderId);
    }

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

  async driverAccept(orderId: string, driverId: string) {
    const result = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >`UPDATE "Order" SET driver_id = ${driverId}, status = 'accepted' WHERE id = ${orderId} AND status = 'broadcasted' RETURNING id`;
    if (!result || result.length === 0) {
      throw new ConflictException('Order already taken');
    }
    await this.prisma.orderEvent.create({
      data: {
        order_id: orderId,
        actor_user_id: driverId,
        event_type: 'driver_accepted',
        payload: { driver_id: driverId },
      },
    });
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, master: true },
    });
  }

  async driverDelivered(orderId: string, driverId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }
    if (order.driver_id !== driverId) {
      throw new ForbiddenException('You can only update orders you accepted');
    }
    if (order.status !== OrderStatus.accepted) {
      throw new BadRequestException(
        `Order must be in accepted status. Current status: ${order.status}`,
      );
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.delivered_by_driver },
      }),
      this.prisma.orderEvent.create({
        data: {
          order_id: orderId,
          actor_user_id: driverId,
          event_type: 'driver_delivered',
          payload: {},
        },
      }),
    ]);
    return updated;
  }

  async receive(orderId: string, masterId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }
    if (order.master_id !== masterId) {
      throw new ForbiddenException('You can only receive your own orders');
    }
    if (order.status !== OrderStatus.delivered_by_driver) {
      throw new BadRequestException(
        `Order must be in delivered_by_driver status. Current status: ${order.status}`,
      );
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.working },
      }),
      this.prisma.orderEvent.create({
        data: {
          order_id: orderId,
          actor_user_id: masterId,
          event_type: 'received_by_master',
          payload: {},
        },
      }),
    ]);
    return updated;
  }

  async customerConfirm(token: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        confirm_token: token,
        status: OrderStatus.waiting_customer_confirmation,
      },
      include: {
        orderItems: true,
        master: true,
        driver: true,
        organization: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Invalid or expired confirmation token');
    }

    const servicesSum = order.orderItems
      .filter((i) => i.item_type === OrderItemType.service)
      .reduce(
        (sum, i) => sum + Number(i.price_at_time) * i.quantity,
        0,
      );
    const deliveryFee = order.delivery_needed ? DELIVERY_FEE : 0;
    const masterPercent = Number(order.master.percent_rate);
    const driverPercent = order.driver
      ? Number(order.driver.percent_rate)
      : 0;
    const masterFee = (servicesSum * masterPercent) / 100;
    const driverFee = (deliveryFee * driverPercent) / 100;
    const totalAmount = Number(order.total_amount);

    await this.prisma.$transaction(async (tx) => {
      const prismaTx = tx as unknown as PrismaService;

      await prismaTx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.completed,
          completed_at: new Date(),
        },
      });

      const productItems = order.orderItems.filter(
        (i) => i.item_type === OrderItemType.product && i.product_id,
      );
      for (const item of productItems) {
        if (!item.product_id) continue;
        await prismaTx.product.update({
          where: { id: item.product_id },
          data: {
            stock_count: { decrement: item.quantity },
          },
        });
      }

      if (order.organization_id) {
        await prismaTx.organization.update({
          where: { id: order.organization_id },
          data: {
            balance_due: { increment: totalAmount },
          },
        });
      }

      await prismaTx.orderEvent.create({
        data: {
          order_id: order.id,
          actor_user_id: null,
          event_type: 'customer_completed',
          payload: {
            master_fee: masterFee,
            driver_fee: driverFee,
            services_sum: servicesSum,
            delivery_fee: deliveryFee,
            total_amount: totalAmount,
            organization_balance_added: order.organization_id
              ? totalAmount
              : null,
          },
        },
      });
    });

    return this.prisma.order.findUnique({
      where: { id: order.id },
      include: { orderItems: true, master: true },
    });
  }
}
