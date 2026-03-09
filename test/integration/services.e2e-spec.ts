import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(__dirname, '../../.env') });

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, getAdminToken } from '../helpers/e2e-app';

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

      const response = await request(app.getHttpServer())
        .post('/admin/services')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('E2E Test Service');
      expect(Number(response.body.price)).toBe(150000);
    });

    it('should reject service with missing name', async () => {
      const createDto = { price: 100 };

      const response = await request(app.getHttpServer())
        .post('/admin/services')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should reject service with invalid price (negative)', async () => {
      const createDto = { name: 'Test', price: -10 };

      const response = await request(app.getHttpServer())
        .post('/admin/services')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should reject request without auth', async () => {
      await request(app.getHttpServer())
        .post('/admin/services')
        .send({ name: 'Test', price: 100 })
        .expect(401);
    });
  });

  describe('GET /admin/services', () => {
    it('should return list of services', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/services')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });

    it('should reject request without auth', async () => {
      await request(app.getHttpServer()).get('/admin/services').expect(401);
    });
  });
});
