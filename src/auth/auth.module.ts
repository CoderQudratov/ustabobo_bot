import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TelegramWebAppGuard } from './guards/telegram-webapp.guard';
import { TelegramInitDataGuard } from './guards/telegram-initdata.guard';
import { MasterAuthGuard } from './guards/master-auth.guard';
import { WebappController } from './webapp.controller';
import { WebappService } from './webapp.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ?? 'avtopro-erp-secret-change-in-production',
      signOptions: { expiresIn: '1h' },
    }),
    TelegramModule,
  ],
  controllers: [AuthController, WebappController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    TelegramWebAppGuard,
    TelegramInitDataGuard,
    MasterAuthGuard,
    WebappService,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    TelegramWebAppGuard,
    TelegramInitDataGuard,
    MasterAuthGuard,
  ],
})
export class AuthModule {}
