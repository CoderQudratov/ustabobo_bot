import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BroadcastProducer } from '../broadcast/broadcast-producer.service';
import { BotNotifyService } from '../bot/bot-notify.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { LocationDto } from './dto/location.dto';
import {
  OrderStatus,
  OrderItemType,
  Prisma,
} from '../../generated/prisma/client';
import { randomUUID } from 'node:crypto';
import { calculateOrderTotal, DELIVERY_FEE } from './price-calculator';
import { assertTransition } from './order-status-machine';
import { config } from '../config/configuration';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly broadcastProducer: BroadcastProducer,
    private readonly botNotify: BotNotifyService,
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
      services.map((s) => [s.id, Number(s.price)] as [string, number]),
    );
    const productPriceMap = new Map<string, number>(
      productRecords.map(
        (p) => [p.id, Number(p.sale_price)] as [string, number],
      ),
    );

    const created = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const order = await tx.order.create({
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
          const price = Number(servicePriceMap.get(serviceId) ?? 0);
          itemData.push({
            order_id: order.id,
            item_type: OrderItemType.service,
            service_id: serviceId,
            quantity: 1,
            price_at_time: price,
          });
        }
        for (const p of products) {
          const price = Number(productPriceMap.get(p.product_id) ?? 0);
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
            price_at_time: Number(mp.price),
          });
        }

        await tx.orderItem.createMany({
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

        await tx.orderEvent.create({
          data: {
            order_id: order.id,
            actor_user_id: masterId,
            event_type: 'draft_created',
            payload: { status: OrderStatus.draft },
          },
        });

        return tx.order.findUnique({
          where: { id: order.id },
          include: { orderItems: true },
        });
      },
    );
    // Proactive bot message: branch on delivery_needed (ask location vs confirm keyboard)
    if (created) {
      this.botNotify
        .sendMessageAfterDraft({
          id: created.id,
          master_id: created.master_id,
          delivery_needed: created.delivery_needed,
        })
        .catch((err) =>
          console.error('[OrdersService] sendMessageAfterDraft:', err),
        );
    }
    return created!;
  }

  /**
   * Find active draft order for master by Telegram ID, add location and move to waiting_confirmation.
   * Used by the bot when user sends location. Returns null if no draft found.
   */
  async addLocationToDraft(
    telegramId: number,
    lat: number,
    lon: number,
  ): Promise<{ id: string; master_id: string; total_amount: number } | null> {
    const tgIdStr = String(telegramId);
    const user = await this.prisma.user.findFirst({
      where: { tg_id: tgIdStr, is_active: true },
    });
    if (!user) return null;

    const draft = await this.prisma.order.findFirst({
      where: { master_id: user.id, status: OrderStatus.draft },
      orderBy: { created_at: 'desc' },
    });
    if (!draft) return null;

    const updated = await this.setLocation(draft.id, user.id, {
      lat,
      lng: lon,
    });
    const totalAmount = Number(updated.total_amount);
    return {
      id: updated.id,
      master_id: updated.master_id,
      total_amount: totalAmount,
    };
  }

  /** Resolve master id from Telegram ID (Prisma tg_id is string; handle number/BigInt from client). */
  async findMasterByTelegramId(
    telegramId: string | number,
  ): Promise<{ id: string } | null> {
    const tgIdStr =
      typeof telegramId === 'number' || typeof telegramId === 'bigint'
        ? String(telegramId)
        : String(telegramId ?? '').trim();
    if (!tgIdStr) return null;
    const user = await this.prisma.user.findFirst({
      where: { tg_id: tgIdStr, is_active: true },
      select: { id: true },
    });
    return user ? { id: user.id } : null;
  }

  /** Find user (any role) by Telegram ID. */
  async findUserByTelegramId(
    telegramId: string | number,
  ): Promise<{ id: string; role: string } | null> {
    const tgIdStr =
      typeof telegramId === 'number' || typeof telegramId === 'bigint'
        ? String(telegramId)
        : String(telegramId ?? '').trim();
    const user = await this.prisma.user.findFirst({
      where: { tg_id: tgIdStr, is_active: true },
      select: { id: true, role: true },
    });
    return user ? { id: user.id, role: user.role } : null;
  }

  /** Fetch orders for "My Orders" WebApp: master/boss by master_id, driver by driver_id. */
  async getMyOrders(telegramId: string | number) {
    const user = await this.findUserByTelegramId(telegramId);
    if (!user) return [];
    return this.getMyOrdersByUserId(user.id, user.role);
  }

  /** Fetch orders by DB user id (used when auth is via initData guard; no telegramId in URL). */
  async getMyOrdersByUserId(userId: string, role: string) {
    const where =
      role === 'driver' ? { driver_id: userId } : { master_id: userId };
    return this.prisma.order.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        master: { select: { id: true, fullname: true, login: true } },
        driver: { select: { id: true, fullname: true } },
        orderItems: {
          include: {
            product: true,
            service: true,
          },
        },
      },
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
    try {
      assertTransition(
        order.status,
        OrderStatus.waiting_confirmation,
        'setLocation',
      );
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid status transition',
      );
    }
    const itemsForTotal = order.orderItems.map((i) => ({
      item_type: i.item_type,
      price_at_time: Number(i.price_at_time),
      quantity: i.quantity,
    }));
    const totalAmount = calculateOrderTotal(
      itemsForTotal,
      order.delivery_needed,
    );

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
      include: { orderItems: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }
    if (order.master_id !== masterId) {
      throw new ForbiddenException('You can only confirm your own orders');
    }
    const newStatus = order.delivery_needed
      ? OrderStatus.broadcasted
      : OrderStatus.waiting_master_work_start;
    try {
      assertTransition(order.status, newStatus, 'confirm');
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid status transition',
      );
    }

    // When confirming from draft (no location), total_amount may be 0 — use shared calculator
    const itemsForTotal =
      order.orderItems?.map((i) => ({
        item_type: i.item_type,
        price_at_time: Number(i.price_at_time),
        quantity: i.quantity,
      })) ?? [];
    const totalAmount =
      order.status === OrderStatus.draft &&
      Number(order.total_amount) === 0 &&
      itemsForTotal.length
        ? calculateOrderTotal(itemsForTotal, order.delivery_needed)
        : Number(order.total_amount);

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus, total_amount: totalAmount },
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
    if (
      !order.delivery_needed &&
      newStatus === OrderStatus.waiting_master_work_start
    ) {
      const master = await this.prisma.user.findUnique({
        where: { id: order.master_id },
        select: { tg_id: true },
      });
      if (master?.tg_id) {
        await this.botNotify.sendWorkStartConfirmationRequest(
          master.tg_id,
          orderId,
          order.car_photo_url,
        );
      }
    }

    return updated;
  }

  /** Master confirms "Ishni boshlaysizmi?" -> Ha. No-delivery path: waiting_master_work_start -> working. */
  async masterStartWork(orderId: string, masterId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { master: { select: { tg_id: true } } },
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }
    if (order.master_id !== masterId) {
      throw new ForbiddenException(
        'You can only start work on your own orders',
      );
    }
    try {
      assertTransition(order.status, OrderStatus.working, 'masterStartWork');
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid status transition',
      );
    }
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.working },
      }),
      this.prisma.orderEvent.create({
        data: {
          order_id: orderId,
          actor_user_id: masterId,
          event_type: 'master_started_work',
          payload: {},
        },
      }),
    ]);
    if (order.master?.tg_id) {
      await this.botNotify.sendWorkStartedToMaster(order.master.tg_id);
    }
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, master: true },
    });
  }

  /** Cancel order (draft or waiting_confirmation). Used by bot "Bekor qilish" button. */
  async cancelOrder(orderId: string, masterId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }
    if (order.master_id !== masterId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }
    try {
      assertTransition(order.status, OrderStatus.cancelled, 'cancelOrder');
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid status transition',
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.cancelled },
      }),
      this.prisma.orderEvent.create({
        data: {
          order_id: orderId,
          actor_user_id: masterId,
          event_type: 'cancelled',
          payload: { previous_status: order.status },
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
    try {
      assertTransition(
        order.status,
        OrderStatus.waiting_customer_confirmation,
        'finish',
      );
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid status transition',
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

    const botUsername = config.telegramBotUsername;
    const deepLink = botUsername
      ? `https://t.me/${botUsername}?start=conf_${confirmToken}`
      : '';
    const master = await this.prisma.user.findUnique({
      where: { id: order.master_id },
      select: { tg_id: true },
    });
    if (master?.tg_id && deepLink) {
      await this.botNotify.sendFinishLinkToMaster(master.tg_id, deepLink);
    }
    return { confirm_token: confirmToken, deep_link: deepLink };
  }

  /** Driver marks delivery done in WebApp: received_by_driver -> waiting_master_delivery_confirmation; bot asks Master Ha/Yo'q. */
  async driverFinish(orderId: string, driverId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { master: { select: { tg_id: true } } },
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }
    if (order.driver_id !== driverId) {
      throw new ForbiddenException('You can only update orders you accepted');
    }
    try {
      assertTransition(
        order.status,
        OrderStatus.waiting_master_delivery_confirmation,
        'driverFinish',
      );
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid status transition',
      );
    }
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.waiting_master_delivery_confirmation },
      }),
      this.prisma.orderEvent.create({
        data: {
          order_id: orderId,
          actor_user_id: driverId,
          event_type: 'driver_finished',
          payload: {},
        },
      }),
    ]);
    if (order.master?.tg_id) {
      await this.botNotify.sendDeliveryConfirmationRequestToMaster(
        order.master.tg_id,
        orderId,
        order.car_photo_url,
      );
    }
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, master: true },
    });
  }

  /** Master confirms or rejects delivery (from bot inline buttons). When confirmed, credit 30,000 UZS to driver (once, in same tx). */
  async masterConfirmDelivery(
    orderId: string,
    masterId: string,
    confirmed: boolean,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        master: { select: { tg_id: true } },
        driver: { select: { id: true, tg_id: true } },
      },
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }
    if (order.master_id !== masterId) {
      throw new ForbiddenException(
        'You can only confirm delivery for your own orders',
      );
    }
    const targetStatus = confirmed
      ? OrderStatus.working
      : OrderStatus.received_by_driver;
    try {
      assertTransition(
        order.status,
        targetStatus,
        confirmed ? 'masterConfirmDelivery' : 'masterRejectDelivery',
      );
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid status transition',
      );
    }

    const driverId = order.driver_id;
    const deliveryCreditAmount = DELIVERY_FEE;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: targetStatus },
      });
      await tx.orderEvent.create({
        data: {
          order_id: orderId,
          actor_user_id: masterId,
          event_type: confirmed
            ? 'master_confirmed_delivery'
            : 'master_rejected_delivery',
          payload: { confirmed },
        },
      });
      if (confirmed && driverId) {
        const existing = await tx.transaction.findUnique({
          where: {
            order_id_user_id_type: {
              order_id: orderId,
              user_id: driverId,
              type: 'delivery_fee',
            },
          },
        });
        if (!existing) {
          await tx.transaction.create({
            data: {
              order_id: orderId,
              user_id: driverId,
              amount: deliveryCreditAmount,
              type: 'delivery_fee',
            },
          });
          await tx.user.update({
            where: { id: driverId },
            data: { balance: { increment: deliveryCreditAmount } },
          });
        }
      }
    });

    if (confirmed && order.master?.tg_id) {
      await this.botNotify.sendMasterCanStartWork(order.master.tg_id);
    }
    if (!confirmed && order.driver?.tg_id) {
      await this.botNotify.sendDeliveryRejectedToDriver(order.driver.tg_id);
    }
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true, master: true, driver: true },
    });
  }

  /**
   * Deep-link confirmation helper for bot (/start conf_UUID).
   * Delegates to customerConfirm, which implements TZ §§12–13 (stock + finance in $transaction).
   */
  async confirmByToken(token: string) {
    return this.customerConfirm(token);
  }

  /**
   * Atomic accept: only the first driver who clicks gets the order (TZ §7.2).
   * UPDATE ... WHERE status = 'broadcasted' RETURNING ensures a single winner; others get empty and see "Kech qoldingiz".
   */
  async driverAccept(orderId: string, driverId: string) {
    const result = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >`UPDATE "Order" SET driver_id = ${driverId}, status = 'received_by_driver' WHERE id = ${orderId} AND status = 'broadcasted' RETURNING id`;
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
    try {
      assertTransition(order.status, OrderStatus.working, 'receive');
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid status transition',
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
      .reduce((sum, i) => sum + Number(i.price_at_time) * i.quantity, 0);
    const deliveryFee = order.delivery_needed ? DELIVERY_FEE : 0;
    const masterPercent = Number(order.master.percent_rate);
    const driverPercent = order.driver ? Number(order.driver.percent_rate) : 0;
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
