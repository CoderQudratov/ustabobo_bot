import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(__dirname, '../../.env') });

import { INestApplication } from '@nestjs/common';
import * as http from 'http';
import request from 'supertest';
import { createTestApp, getAdminToken } from '../helpers/e2e-app';

interface ErrorResponseBody {
  success: boolean;
  error?: { code: string; message?: string };
  requestId?: string;
}

interface ClientOrdersSuccessBody {
  client: unknown;
  orders: unknown[];
}

describe('Client Orders (E2E)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getAdminToken(app);
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch {
      // Telegraf may throw "Bot is not running!" on shutdown
    }
  });

  describe('GET /admin/clients/individuals/orders', () => {
    it('should return 400 when phone is missing', async () => {
      const response = await request(app.getHttpServer() as http.Server)
        .get('/admin/clients/individuals/orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      const body = response.body as ErrorResponseBody;
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error?.code).toBe('PHONE_REQUIRED');
      expect(body.requestId).toBeDefined();
    });

    it('should return 400 when phone is empty', async () => {
      const response = await request(app.getHttpServer() as http.Server)
        .get('/admin/clients/individuals/orders?phone=')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      const body = response.body as ErrorResponseBody;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('PHONE_REQUIRED');
    });

    it('should return 400 when phone has fewer than 7 digits', async () => {
      const response = await request(app.getHttpServer() as http.Server)
        .get('/admin/clients/individuals/orders?phone=123')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      const body = response.body as ErrorResponseBody;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('PHONE_INVALID');
    });

    it('should return 200 with client and orders when phone is valid', async () => {
      const response = await request(app.getHttpServer() as http.Server)
        .get('/admin/clients/individuals/orders?phone=998901234567')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const body = response.body as ClientOrdersSuccessBody;
      expect(body).toHaveProperty('client');
      expect(body).toHaveProperty('orders');
      expect(Array.isArray(body.orders)).toBe(true);
    });

    it('should reject request without auth', async () => {
      await request(app.getHttpServer() as http.Server)
        .get('/admin/clients/individuals/orders?phone=998901234567')
        .expect(401);
    });
  });
});
