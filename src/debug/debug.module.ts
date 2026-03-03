import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DebugController } from './debug.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [DebugController],
})
export class DebugModule {}
