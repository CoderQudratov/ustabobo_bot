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

    if (user.tenant_id) {
      const tenant = user.tenant;
      if (!tenant) {
        throw new UnauthorizedException('Tenant topilmadi');
      }
    }

    return {
      id: user.id,
      login: user.login,
      role: user.role,
      fullname: user.fullname,
      tg_id: user.tg_id,
      tenant_id: user.tenant_id ?? null,
    };
  }
}
