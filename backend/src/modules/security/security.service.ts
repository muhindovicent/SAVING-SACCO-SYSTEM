import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
  ) {}

  async encryptPII(data: string): Promise<string> {
    // AES-256-GCM encryption placeholder
    // In production, use a proper encryption library with key rotation
    const encrypted = Buffer.from(data).toString('base64');
    return `enc:${encrypted}`;
  }

  async decryptPII(encryptedData: string): Promise<string> {
    if (!encryptedData.startsWith('enc:')) return encryptedData;
    const data = encryptedData.substring(4);
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  async generateAuditTrail(
    userId: string,
    action: string,
    resource: string,
    details: any,
  ) {
    await this.prisma.systemEvent.create({
      data: {
        eventType: action,
        severity: 'INFO',
        message: `${action} on ${resource}`,
        metadata: details,
        source: 'SECURITY_MODULE',
        actorId: userId,
      },
    });
  }

  async detectFraud(memberId: string, transaction: any): Promise<{ risk: string; score: number; reasons: string[] }> {
    const reasons: string[] = [];
    let riskScore = 0;

    if (transaction.amount > 10000000) {
      riskScore += 30;
      reasons.push('High-value transaction');
    }

    const recentTxns = await this.prisma.savingsTransaction.count({
      where: {
        account: { memberId },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentTxns > 5) {
      riskScore += 20;
      reasons.push('Unusual transaction frequency');
    }

    const risk = riskScore > 50 ? 'HIGH' : riskScore > 20 ? 'MEDIUM' : 'LOW';

    return { risk, score: riskScore, reasons };
  }

  async isIpWhitelisted(ip: string): Promise<boolean> {
    const whitelist = (this.configService.get('IP_WHITELIST', '') as string).split(',');
    return whitelist.includes(ip) || whitelist.length === 0;
  }
}
