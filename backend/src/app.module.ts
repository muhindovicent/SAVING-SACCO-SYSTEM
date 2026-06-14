import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './modules/auth/auth.module';
import { MembersModule } from './modules/members/members.module';
import { SavingsModule } from './modules/savings/savings.module';
import { LoansModule } from './modules/loans/loans.module';
import { SharesModule } from './modules/shares/shares.module';
import { TreasuryModule } from './modules/treasury/treasury.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SecurityModule } from './modules/security/security.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ScheduleModule.forRoot(),

    PrismaModule,
    CacheModule,
    QueueModule,

    AuthModule,
    MembersModule,
    SavingsModule,
    LoansModule,
    SharesModule,
    TreasuryModule,
    AccountingModule,
    AuditModule,
    ReportsModule,
    NotificationsModule,
    SecurityModule,
    GovernanceModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
