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
}

interface ServiceResponseBody {
  id: string;
  name: string;
  price: number;
}

interface ServiceListResponseBody {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
}

describe('Services (E2E)', () => {
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

  describe('POST /admin/services', () => {
    it('should create service with valid data', async () => {
      const createDto = { name: 'E2E Test Service', price: 150000 };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/admin/services')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(201);
      const body = response.body as ServiceResponseBody;
      expect(body).toHaveProperty('id');
      expect(body.name).toBe('E2E Test Service');
      expect(Number(body.price)).toBe(150000);
    });

    it('should reject service with missing name', async () => {
      const createDto = { price: 100 };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/admin/services')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(400);
      const body = response.body as ErrorResponseBody;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('BAD_REQUEST');
    });

    it('should reject service with invalid price (negative)', async () => {
      const createDto = { name: 'Test', price: -10 };

      const response = await request(app.getHttpServer() as http.Server)
        .post('/admin/services')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(400);
      const body = response.body as ErrorResponseBody;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('BAD_REQUEST');
    });

    it('should reject request without auth', async () => {
      await request(app.getHttpServer() as http.Server)
        .post('/admin/services')
        .send({ name: 'Test', price: 100 })
        .expect(401);
    });
  });

  describe('GET /admin/services', () => {
    it('should return list of services', async () => {
      const response = await request(app.getHttpServer() as http.Server)
        .get('/admin/services')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const body = response.body as ServiceListResponseBody;
      expect(body).toHaveProperty('items');
      expect(Array.isArray(body.items)).toBe(true);
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('page');
      expect(body).toHaveProperty('limit');
    });

    it('should reject request without auth', async () => {
      await request(app.getHttpServer() as http.Server)
        .get('/admin/services')
        .expect(401);
    });
  });
});
