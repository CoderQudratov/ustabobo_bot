import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(__dirname, '../../.env') });

import { INestApplication } from '@nestjs/common';
import * as http from 'http';
import request from 'supertest';
import {
  createTestApp,
  getAdminToken,
  createTestOrganization,
} from '../helpers/e2e-app';

interface ErrorResponseBody {
  success: boolean;
  error?: { code: string; message?: string };
  requestId?: string;
}

interface VehicleResponseBody {
  id: string;
  plate_number: string;
  model: string;
  year?: number;
  color?: string;
  vin?: string;
}

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

      const response = await request(app.getHttpServer() as http.Server)
        .post(`/admin/organizations/${orgId}/vehicles`)
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(201);
      const body = response.body as VehicleResponseBody;
      expect(body).toHaveProperty('id');
      expect(body.plate_number).toBe(plate);
      expect(body.model).toBe('Toyota Camry');
      expect(body.year).toBe(2023);
      expect(body.color).toBe('Black');
      expect(body.vin).toBe('12345678901234567');
    });

    it('should create vehicle with only required fields', async () => {
      const plate = `E2E-${Date.now()}-2`;
      const createDto = {
        plate_number: plate,
        model: 'Chevrolet Lacetti',
      };

      const response = await request(app.getHttpServer() as http.Server)
        .post(`/admin/organizations/${orgId}/vehicles`)
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(201);
      const body = response.body as VehicleResponseBody;
      expect(body).toHaveProperty('id');
      expect(body.plate_number).toBe(plate);
      expect(body.model).toBe('Chevrolet Lacetti');
    });

    it('should reject vehicle with missing plate_number', async () => {
      const createDto = { model: 'Toyota' };

      const response = await request(app.getHttpServer() as http.Server)
        .post(`/admin/organizations/${orgId}/vehicles`)
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(400);
      const body = response.body as ErrorResponseBody;
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error?.code).toBe('BAD_REQUEST');
      expect(body.requestId).toBeDefined();
    });

    it('should reject vehicle with missing model', async () => {
      const createDto = { plate_number: 'TEST003' };

      const response = await request(app.getHttpServer() as http.Server)
        .post(`/admin/organizations/${orgId}/vehicles`)
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(400);
      const body = response.body as ErrorResponseBody;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('BAD_REQUEST');
    });

    it('should handle invalid organization ID', async () => {
      const response = await request(app.getHttpServer() as http.Server)
        .post(
          '/admin/organizations/00000000-0000-0000-0000-000000000000/vehicles',
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ plate_number: 'TEST', model: 'Model' })
        .expect(404);
      const body = response.body as ErrorResponseBody;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('should reject request without auth', async () => {
      await request(app.getHttpServer() as http.Server)
        .post(`/admin/organizations/${orgId}/vehicles`)
        .send({ plate_number: 'TEST', model: 'Model' })
        .expect(401);
    });
  });
});
