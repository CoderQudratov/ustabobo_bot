import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

const PORT = process.env.PORT || 3000;

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[unhandledRejection]', reason);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'https://avtopro-webapp-doston-x9.loca.lt',
      'https://avtopro-api-doston-x9.loca.lt',
      'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Init-Data'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(PORT);
  console.log(`API: http://localhost:${PORT}`);
}
bootstrap();
