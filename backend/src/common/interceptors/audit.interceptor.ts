import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';
import { AuditAction, AuditEntity } from '@prisma/client';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip } = request;
    const startTime = Date.now();

    if (method === 'GET' || url.includes('/auth/login')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - startTime;
          this.auditService.log({
            userId: user?.sub || user?.id,
            action: this.mapMethodToAction(method),
            entity: this.mapUrlToEntity(url),
            entityId: request.params?.id,
            description: `${method} ${url}`,
            newValues: method === 'POST' ? request.body : undefined,
            ipAddress: ip,
            userAgent: request.headers?.['user-agent'],
          }).catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

          if (duration > 1000) {
            this.logger.warn(`Slow request: ${method} ${url} (${duration}ms)`);
          }
        },
      }),
    );
  }

  private mapMethodToAction(method: string): AuditAction {
    const map: Record<string, AuditAction> = {
      POST: AuditAction.CREATE,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };
    return map[method] || AuditAction.READ;
  }

  private mapUrlToEntity(url: string): AuditEntity {
    const segments = url.split('/').filter(Boolean);
    for (const segment of segments) {
      if (!['api', 'v1', 'auth'].includes(segment)) {
        const upper = segment.toUpperCase().replace(/-/g, '_');
        if (upper in AuditEntity) {
          return AuditEntity[upper as keyof typeof AuditEntity];
        }
        return AuditEntity.SYSTEM_CONFIG;
      }
    }
    return AuditEntity.SYSTEM_CONFIG;
  }
}
