/**
 * Xavfsizlik E2E: autentifikatsiya, avtorizatsiya, validatsiya.
 * Ishga tushirish: npm run db:seed && npm run test:e2e
 */
import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(__dirname, '../../.env') });

import { INestApplication } from '@nestjs/common';
import * as http from 'http';
import request from 'supertest';
import { createTestApp, getAdminToken } from '../helpers/e2e-app';

describe('Security (E2E)', () => {
  let app: INestApplication;
  let bossToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    bossToken = await getAdminToken(app);
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch {
      // Telegraf shutdown
    }
  });

  describe('Autentifikatsiya', () => {
    it('himoyalangan route token siz 401 qaytaradi', async () => {
      await request(app.getHttpServer() as http.Server)
        .get('/admin/orders')
        .expect(401);
    });

    it('noto‘g‘ri token 401 qaytaradi', async () => {
      await request(app.getHttpServer() as http.Server)
        .get('/admin/orders')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });

    it('to‘g‘ri token bilan himoyalangan route 200 yoki 404 emas 401', async () => {
      const res = await request(app.getHttpServer() as http.Server)
        .get('/admin/orders')
        .set('Authorization', `Bearer ${bossToken}`);
      expect([200, 400]).toContain(res.status);
      expect(res.status).not.toBe(401);
    });
  });

  describe('Validatsiya (forbidNonWhitelisted)', () => {
    it('login so‘rovida qo‘shimcha field 400', async () => {
      const res = await request(app.getHttpServer() as http.Server)
        .post('/admin/auth/login')
        .send({
          login: 'admin',
          password: 'admin123',
          extraField: 'should-be-rejected',
        });
      expect(res.status).toBe(400);
    });
  });
});
