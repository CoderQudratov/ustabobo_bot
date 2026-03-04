import 'dotenv/config';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import { validateEnv, getSafeStartupConfig } from './config/env';
import { AppModule } from './app.module';
import { config } from './config/configuration';

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
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.enableCors({
    origin: [
      'https://ustabobo.netlify.app',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
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
  const port = parseInt(String(process.env.PORT || '10000'), 10);
  await app.listen(port, '0.0.0.0');
  console.log(
    `API: ${config.apiBaseUrl} (port ${port}, host 0.0.0.0)`,
  );
}
void bootstrap();
