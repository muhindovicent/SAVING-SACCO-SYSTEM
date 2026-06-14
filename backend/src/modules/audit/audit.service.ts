import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditAction, AuditEntity } from '@prisma/client';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string;
    action: AuditAction;
    entity: AuditEntity;
    entityId?: string;
    description?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    correlationId?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          description: params.description,
          oldValues: params.oldValues,
          newValues: params.newValues,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          sessionId: params.sessionId,
          correlationId: params.correlationId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${(error as Error).message}`);
    }
  }

  async getLogs(filters: {
    page: number;
    limit: number;
    userId?: string;
    action?: string;
    entity?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page, limit, userId, action, entity, startDate, endDate } = filters;
    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { username: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getSystemEvents(filters: {
    page: number;
    limit: number;
    level?: string;
  }) {
    const { page, limit, level } = filters;
    const where: any = {};
    if (level) where.severity = level;

    const [data, total] = await Promise.all([
      this.prisma.systemEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.systemEvent.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStatistics() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalLogs, todayLogs, actionCounts] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        orderBy: { _count: { action: 'desc' } },
      }),
    ]);

    return { totalLogs, todayLogs, actionCounts };
  }
}
