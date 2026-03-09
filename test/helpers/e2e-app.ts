import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as http from 'http';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';

const ADMIN_LOGIN = 'admin';
const ADMIN_PASSWORD = 'admin123';

interface LoginResponse {
  access_token: string;
}

interface OrganizationResponse {
  id: string;
}

/**
 * Creates an Nest application for E2E tests with ValidationPipe and AllExceptionsFilter
 * so that responses match production (e.g. error.body.error.code).
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

/**
 * Returns a valid JWT for the seeded boss user (admin / admin123).
 * Requires database to be seeded (npm run db:seed).
 */
export async function getAdminToken(app: INestApplication): Promise<string> {
  const server = app.getHttpServer() as http.Server;
  const res = await request(server)
    .post('/admin/auth/login')
    .send({ login: ADMIN_LOGIN, password: ADMIN_PASSWORD })
    .expect(200);
  const body = res.body as unknown as LoginResponse;
  const token = body.access_token;
  if (!token || typeof token !== 'string') {
    throw new Error('Admin login failed: no access_token. Run db:seed.');
  }
  return token;
}

/**
 * Creates an organization and returns its id. Uses the given token.
 */
export async function createTestOrganization(
  app: INestApplication,
  token: string,
): Promise<string> {
  const server = app.getHttpServer() as http.Server;
  const res = await request(server)
    .post('/admin/organizations')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'E2E Test Org',
      contact_person: 'Test Contact',
      phone: '+998901234567',
      payment_type: 'cash',
    })
    .expect(201);
  const body = res.body as unknown as OrganizationResponse;
  const id = body.id;
  if (!id || typeof id !== 'string') {
    throw new Error('Create organization failed: no id');
  }
  return id;
}
