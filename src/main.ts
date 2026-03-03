import 'dotenv/config';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import express from 'express';
import { AppModule } from './app.module';
import { config } from './config/configuration';

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
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Telegram-Init-Data',
      'Accept',
      'Origin',
      'Accept-Language',
    ],
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
  await app.listen(config.port);
  console.log(`API: ${config.apiBaseUrl}`);
}
bootstrap();
