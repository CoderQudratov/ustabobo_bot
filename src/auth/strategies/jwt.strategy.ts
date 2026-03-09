import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET ?? 'avtopro-erp-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, is_active: true },
      include: { tenant: true },
    });
    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    // Super admin uchun tenant tekshirish kerak emas
    // Bloklangan / inactive tenant uchun ham JWT qaytaramiz — ERP da blok ekrani
    // ko'rsatish uchun GET /admin/auth/tenant-status ishlatiladi
    if (!user.is_super_admin && user.tenant_id) {
      const tenant = user.tenant;
      if (!tenant) {
        throw new UnauthorizedException('Tenant topilmadi');
      }
      // tenant.is_blocked yoki !tenant.is_active bo'lsa ham request davom etadi,
      // frontend tenant-status orqali blok ekranini ko'rsatadi
    }

    return {
      id: user.id,
      login: user.login,
      role: user.role,
      fullname: user.fullname,
      tg_id: user.tg_id,
      is_super_admin: user.is_super_admin ?? false,
      tenant_id: user.tenant_id ?? null,
    };
  }
}
