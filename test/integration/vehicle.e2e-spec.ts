import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(__dirname, '../../.env') });

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  getAdminToken,
  createTestOrganization,
} from '../helpers/e2e-app';

describe('Vehicle Creation (E2E)', () => {
  let app: INestApplication;
  let orgId: string;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getAdminToken(app);
    orgId = await createTestOrganization(app, token);
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch {
      // Telegraf may throw "Bot is not running!" on shutdown
    }
  });

  describe('POST /admin/organizations/:orgId/vehicles', () => {
    it('should create vehicle with valid data', async () => {
      const plate = `E2E-${Date.now()}`;
      const createDto = {
        plate_number: plate,
        model: 'Toyota Camry',
        year: 2023,
        color: 'Black',
        vin: '12345678901234567',
      };

      const response = await request(app.getHttpServer())
        .post(`/admin/organizations/${orgId}/vehicles`)
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.plate_number).toBe(plate);
      expect(response.body.model).toBe('Toyota Camry');
      expect(response.body.year).toBe(2023);
      expect(response.body.color).toBe('Black');
      expect(response.body.vin).toBe('12345678901234567');
    });

    it('should create vehicle with only required fields', async () => {
      const plate = `E2E-${Date.now()}-2`;
      const createDto = {
        plate_number: plate,
        model: 'Chevrolet Lacetti',
      };

      const response = await request(app.getHttpServer())
        .post(`/admin/organizations/${orgId}/vehicles`)
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.plate_number).toBe(plate);
      expect(response.body.model).toBe('Chevrolet Lacetti');
    });

    it('should reject vehicle with missing plate_number', async () => {
      const createDto = { model: 'Toyota' };

      const response = await request(app.getHttpServer())
        .post(`/admin/organizations/${orgId}/vehicles`)
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.requestId).toBeDefined();
    });

    it('should reject vehicle with missing model', async () => {
      const createDto = { plate_number: 'TEST003' };

      const response = await request(app.getHttpServer())
        .post(`/admin/organizations/${orgId}/vehicles`)
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should handle invalid organization ID', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/organizations/00000000-0000-0000-0000-000000000000/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .send({ plate_number: 'TEST', model: 'Model' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should reject request without auth', async () => {
      await request(app.getHttpServer())
        .post(`/admin/organizations/${orgId}/vehicles`)
        .send({ plate_number: 'TEST', model: 'Model' })
        .expect(401);
    });
  });
});
