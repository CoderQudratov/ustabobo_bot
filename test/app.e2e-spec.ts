import { join } from 'path';
import { config } from 'dotenv';

// Load .env so e2e can start app (BOT_TOKEN, WEBAPP_URL, DATABASE_URL)
config({ path: join(__dirname, '../.env') });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    try {
      if (app) await app.close();
    } catch {
      // Telegraf may throw "Bot is not running!" on shutdown in test env
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res: { text: string }) => {
        expect(res.text).toContain('AVTO-PRO API');
        expect(res.text).toContain('Status: OK');
      });
  });
});
