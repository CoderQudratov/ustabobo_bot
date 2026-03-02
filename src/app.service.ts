import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'AVTO-PRO API. Status: OK. Endpoints: GET / (this), POST /admin/auth/login (JWT), GET /webapp/init (X-Telegram-Init-Data), POST /orders (JWT or Telegram).';
  }
}
