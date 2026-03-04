import 'dotenv/config';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import { validateEnv, getSafeStartupConfig } from './config/env';
import { AppModule } from './app.module';
import { config } from './config/configuration';
import { PrismaService } from './prisma/prisma.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Fail fast if BOT_TOKEN missing or placeholder (avoids "Invalid Telegram init data signature")
validateEnv();
const safeConfig = getSafeStartupConfig();
console.log('[Startup] BOT_TOKEN prefix:', safeConfig.botTokenPrefix);
console.log('[Startup] WEBAPP_URL:', safeConfig.webappUrl);
console.log('[Startup] NODE_ENV:', safeConfig.nodeEnv);
if (process.env.PUBLIC_URL?.trim()) {
  console.log('[Startup] PUBLIC_URL:', process.env.PUBLIC_URL.trim());
}
console.log(
  '[Startup] TELEGRAM_INIT_DATA_MAX_AGE_SEC:',
  safeConfig.initDataMaxAgeSec,
);

const UPLOADS_DIR = join(process.cwd(), 'uploads');
const CAR_PHOTOS_DIR = join(UPLOADS_DIR, 'car-photos');
if (!existsSync(CAR_PHOTOS_DIR)) {
  mkdirSync(CAR_PHOTOS_DIR, { recursive: true });
}

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[unhandledRejection]', reason);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use('/uploads', express.static(UPLOADS_DIR));
  const webappOrigin = process.env.WEBAPP_URL?.trim().replace(/\/+$/, '');
  const corsOrigins: string[] = [
    'https://ustabobo.netlify.app',
    'https://erpusta.netlify.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  if (webappOrigin && !corsOrigins.includes(webappOrigin)) {
    corsOrigins.push(webappOrigin);
  }
  const erpOrigin = process.env.ERP_URL?.trim().replace(/\/+$/, '');
  if (erpOrigin && !corsOrigins.includes(erpOrigin)) {
    corsOrigins.push(erpOrigin);
  }
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-telegram-init-data',
      'X-Telegram-Init-Data',
      'Accept',
      'Origin',
      'Accept-Language',
      'Cache-Control',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    optionsSuccessStatus: 200,
    preflightContinue: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const prisma = app.get(PrismaService);
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Startup] Database not ready or schema missing:', msg);
    console.error('[Startup] Run: npx prisma migrate deploy');
    throw err;
  }
  console.log('[Startup] DB ready');

  const port = parseInt(String(process.env.PORT || '10000'), 10);
  await app.listen(port, '0.0.0.0');
  console.log(
    `API: ${config.apiBaseUrl} (port ${port}, host 0.0.0.0)`,
  );
}
void bootstrap();
