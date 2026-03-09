import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { WebAppOrJwtGuard } from './guards/webapp-or-jwt.guard';
import { TelegramWebAppUser } from './guards/telegram-webapp.guard';
import { AuthService } from './auth.service';
import { WebappService } from './webapp.service';
import { LoginDto } from './dto/login.dto';
import { WebappCreateVehicleDto } from './dto/create-vehicle.dto';

@Controller('webapp')
@Public()
export class WebappController {
  constructor(
    private readonly webappService: WebappService,
    private readonly authService: AuthService,
  ) {}

  /** WebApp login: login/password → JWT (8h) + user. Only is_active users. */
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async webappLogin(@Body() dto: LoginDto) {
    return this.authService.webappLogin(dto.login, dto.password);
  }

  /** Returns JSON only. Accepts either Bearer JWT (webapp login) or x-telegram-init-data. */
  @Get('init')
  @UseGuards(WebAppOrJwtGuard)
  async getInit(@Req() req: Request & { user: TelegramWebAppUser }) {
    const user = req.user;
    const telegramId = user.telegramId;
    const firstName = user.fullname?.trim().split(/\s+/)[0] || user.login || '';
    console.log('WEBAPP INIT USER', telegramId);

    const catalog = await this.webappService.getInitData();
    return {
      ok: true,
      telegramId,
      username: user.login,
      firstName,
      authDate: user.authDate,
      ...catalog,
    };
  }

  /** Search services for new order. ?search=&limit=5 or ?sortBy=usage&limit=3 */
  @Get('services')
  @UseGuards(WebAppOrJwtGuard)
  async getServices(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    const limitNum = Math.min(
      20,
      Math.max(1, parseInt(limit ?? '5', 10) || 5),
    );
    const items = await this.webappService.searchServices({
      search: search ?? undefined,
      limit: limitNum,
      sortBy:
        sortBy === 'usage' ? 'usage' : undefined,
    });
    return { items };
  }

  /** Search products for new order. ?search=&limit=5 or ?sortBy=usage&limit=3 */
  @Get('products')
  @UseGuards(WebAppOrJwtGuard)
  async getProducts(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    const limitNum = Math.min(
      20,
      Math.max(1, parseInt(limit ?? '5', 10) || 5),
    );
    const items = await this.webappService.searchProducts({
      search: search ?? undefined,
      limit: limitNum,
      sortBy:
        sortBy === 'usage' ? 'usage' : undefined,
    });
    return { items };
  }

  /** List vehicles of an organization (for order form). */
  @Get('organizations/:orgId/vehicles')
  @UseGuards(WebAppOrJwtGuard)
  async getOrgVehicles(@Param('orgId') orgId: string) {
    const items = await this.webappService.getOrgVehicles(orgId);
    return { items };
  }

  /** Create vehicle for organization ("Yangi mashina qo'sh"). */
  @Post('organizations/:orgId/vehicles')
  @UseGuards(WebAppOrJwtGuard)
  async createOrgVehicle(
    @Param('orgId') orgId: string,
    @Body() dto: WebappCreateVehicleDto,
  ) {
    return this.webappService.createOrgVehicle(orgId, {
      plate_number: dto.plate_number,
      model: dto.model,
      year: dto.year,
      color: dto.color,
    });
  }

  /** Error Boundary reporting: log client errors with telegram_id for debugging. No auth required. */
  @Post('log-error')
  logError(
    @Body() body: { message?: string; stack?: string; telegram_id?: string },
  ) {
    const { message, stack, telegram_id } = body ?? {};
    console.error('[WebApp Error]', { message, stack, telegram_id });
    return { ok: true };
  }
}
