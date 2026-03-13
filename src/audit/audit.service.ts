import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogParams {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  meta?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    const { userId, action, entity, entityId, meta } = params;
    try {
      await this.prisma.auditLog.create({
        data: {
          user_id: userId ?? null,
          action,
          entity,
          entity_id: entityId ?? null,
          meta: meta as any,
        },
      });
    } catch (e) {
      // Audit log failure must never break main business flow

      console.error('[AuditLog] failed to write', e);
    }
  }
}
