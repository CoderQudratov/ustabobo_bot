import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../../generated/prisma/client';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { ExtendPlanDto } from './dto/create-tenant.dto';

@Injectable()
export class AdminTenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        _count: { select: { users: true, orders: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const now = new Date();
    return tenants.map((t) => {
      const { _count, ...rest } = t;
      return {
        ...rest,
        days_left: t.plan_expires
          ? Math.ceil(
              (new Date(t.plan_expires).getTime() - now.getTime()) / 86400000,
            )
          : null,
        users_count: _count.users,
        orders_count: _count.orders,
      };
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: Role.boss },
          select: { id: true, fullname: true, login: true, phone: true },
        },
        _count: { select: { users: true, orders: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant topilmadi');
    return tenant;
  }

  async create(dto: CreateTenantDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { login: dto.admin_login },
    });
    if (existingUser) {
      throw new ConflictException(
        'Bu login band. Boshqa login tanlang.',
      );
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
        plan_expires: new Date(dto.plan_expires),
        is_active: true,
        is_blocked: false,
      },
    });

    const adminPhone =
      dto.admin_phone?.trim() ||
      `+998000${String(Date.now()).slice(-6)}`;
    const hash = await bcrypt.hash(dto.admin_password, 10);
    const admin = await this.prisma.user.create({
      data: {
        fullname: dto.admin_name,
        phone: adminPhone,
        login: dto.admin_login,
        password_hash: hash,
        role: Role.boss,
        percent_rate: 0,
        is_active: true,
        tenant_id: tenant.id,
      },
    });

    return {
      tenant,
      admin: {
        id: admin.id,
        fullname: admin.fullname,
        login: admin.login,
        plain_password: dto.admin_password,
      },
    };
  }

  async toggleBlock(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
    if (!tenant) throw new NotFoundException('Tenant topilmadi');

    return this.prisma.tenant.update({
      where: { id },
      data: { is_blocked: !tenant.is_blocked },
    });
  }

  async toggleActive(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
    if (!tenant) throw new NotFoundException('Tenant topilmadi');

    return this.prisma.tenant.update({
      where: { id },
      data: { is_active: !tenant.is_active },
    });
  }

  async extendPlan(id: string, dto: ExtendPlanDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });
    if (!tenant) throw new NotFoundException('Tenant topilmadi');

    const now = new Date();
    const base =
      tenant.plan_expires && new Date(tenant.plan_expires) > now
        ? new Date(tenant.plan_expires)
        : now;

    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + dto.months);

    return this.prisma.tenant.update({
      where: { id },
      data: {
        plan_expires: newExpiry,
        is_blocked: false,
        is_active: true,
      },
    });
  }

  async getDashboardStats() {
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 86400000);

    const [total, active, blocked, expiringSoon] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({
        where: { is_active: true, is_blocked: false },
      }),
      this.prisma.tenant.count({
        where: { is_blocked: true },
      }),
      this.prisma.tenant.count({
        where: {
          plan_expires: { lte: in7days, gte: now },
          is_blocked: false,
        },
      }),
    ]);

    return { total, active, blocked, expiring_soon: expiringSoon };
  }
}
