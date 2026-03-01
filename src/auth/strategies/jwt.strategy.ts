import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../../generated/prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'avtopro-erp-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, is_active: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return {
      id: user.id,
      login: user.login,
      role: user.role as Role,
      fullname: user.fullname,
    };
  }
}
