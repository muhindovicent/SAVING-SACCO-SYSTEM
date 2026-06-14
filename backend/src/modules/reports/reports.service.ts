import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMemberSummary() {
    const [total, active, byGender, byKycStatus, newThisMonth] = await Promise.all([
      this.prisma.member.count({ where: { isDeleted: false } }),
      this.prisma.member.count({ where: { status: 'ACTIVE', isDeleted: false } }),
      this.prisma.member.groupBy({ by: ['gender'], _count: true, where: { isDeleted: false } }),
      this.prisma.member.groupBy({
        by: ['kycStatus'],
        _count: true,
        where: { isDeleted: false },
      }),
      this.prisma.member.count({
        where: {
          isDeleted: false,
          dateJoined: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return { total, active, inactive: total - active, byGender, byKycStatus, newThisMonth };
  }

  async getSavingsSummary() {
    const [totalAccounts, totalBalance, byProduct, avgBalance] = await Promise.all([
      this.prisma.savingsAccount.count({ where: { isDeleted: false } }),
      this.prisma.savingsAccount.aggregate({
        where: { isDeleted: false },
        _sum: { balance: true },
      }),
      this.prisma.savingsAccount.groupBy({
        by: ['productId'],
        _count: true,
        _sum: { balance: true },
        where: { isDeleted: false },
      }),
      this.prisma.savingsAccount.aggregate({
        where: { isDeleted: false },
        _avg: { balance: true },
      }),
    ]);

    return {
      totalAccounts,
      totalBalance: totalBalance._sum.balance?.toNumber() || 0,
      averageBalance: avgBalance._avg.balance?.toNumber() || 0,
      byProduct,
    };
  }

  async getLoanPortfolio(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const [totalLoans, totalPrincipal, totalBalance, byProduct] = await Promise.all([
      this.prisma.loan.count({ where }),
      this.prisma.loan.aggregate({ where, _sum: { principal: true } }),
      this.prisma.loan.aggregate({ where, _sum: { balance: true } }),
      this.prisma.loan.groupBy({
        by: ['status'],
        _count: true,
        _sum: { balance: true, principal: true },
      }),
    ]);

    return {
      totalLoans,
      totalPrincipal: totalPrincipal._sum.principal?.toNumber() || 0,
      totalOutstanding: totalBalance._sum.balance?.toNumber() || 0,
      byProduct,
    };
  }

  async getAgingAnalysis() {
    const now = new Date();
    const aging = [
      { bucket: '0-30 days', min: 0, max: 30 },
      { bucket: '31-60 days', min: 31, max: 60 },
      { bucket: '61-90 days', min: 61, max: 90 },
      { bucket: '90+ days', min: 91, max: Infinity },
    ];

    const schedules = await this.prisma.loanSchedule.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: now },
      },
      include: { loan: true },
    });

    const results = aging.map((bucket) => {
      const items = schedules.filter((s) => {
        const daysOverdue = Math.floor((now.getTime() - s.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysOverdue >= bucket.min && daysOverdue <= bucket.max;
      });
      const totalAmount = items.reduce((sum, s) => sum + s.balance.toNumber(), 0);
      return { bucket, count: items.length, totalAmount };
    });

    return results;
  }

  async getFinancialReport(startDate: Date, endDate: Date) {
    const [incomeStatement, balanceSheet, cashFlow] = await Promise.all([
      this.getIncomeSummary(startDate, endDate),
      this.getBalanceSheetSummary(endDate),
      this.getCashFlowSummary(startDate, endDate),
    ]);

    return { period: { startDate, endDate }, incomeStatement, balanceSheet, cashFlow };
  }

  private async getIncomeSummary(startDate: Date, endDate: Date) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { entryDate: { gte: startDate, lte: endDate }, isPosted: true },
      select: { id: true },
    });
    const entryIds = entries.map((e) => e.id);

    const lines = await this.prisma.journalLine.findMany({
      where: { journalId: { in: entryIds } },
      include: { account: true },
    });

    let revenue = 0;
    let expenses = 0;

    for (const line of lines) {
      const cat = line.account.category;
      const net = line.debit.toNumber() - line.credit.toNumber();
      if (cat === 'INCOME') revenue += -net;
      else if (cat === 'EXPENSE') expenses += net;
    }

    return { totalRevenue: revenue, totalExpenses: expenses, netIncome: revenue - expenses };
  }

  private async getBalanceSheetSummary(asAt: Date) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { entryDate: { lte: asAt }, isPosted: true },
      select: { id: true },
    });
    const entryIds = entries.map((e) => e.id);

    const lines = await this.prisma.journalLine.findMany({
      where: { journalId: { in: entryIds } },
      include: { account: true },
    });

    let assets = 0;
    let liabilities = 0;
    let equity = 0;

    for (const line of lines) {
      const net = line.debit.toNumber() - line.credit.toNumber();
      const isDebitNormal = line.account.normalSide === 'DEBIT';
      const balance = isDebitNormal ? net : -net;

      if (line.account.category === 'ASSET') assets += balance;
      else if (line.account.category === 'LIABILITY') liabilities += balance;
      else if (line.account.category === 'EQUITY') equity += balance;
    }

    return { totalAssets: assets, totalLiabilities: liabilities, totalEquity: equity };
  }

  private async getCashFlowSummary(startDate: Date, endDate: Date) {
    const cashAccount = await this.prisma.chartOfAccount.findUnique({ where: { code: 'CASH_AND_BANK' } });
    if (!cashAccount) return { inflows: 0, outflows: 0, net: 0 };

    const entries = await this.prisma.journalEntry.findMany({
      where: { entryDate: { gte: startDate, lte: endDate }, isPosted: true },
      select: { id: true },
    });
    const entryIds = entries.map((e) => e.id);

    const lines = await this.prisma.journalLine.findMany({
      where: { journalId: { in: entryIds }, accountId: cashAccount.id },
    });

    const inflows = lines.reduce((s, l) => s + l.debit.toNumber(), 0);
    const outflows = lines.reduce((s, l) => s + l.credit.toNumber(), 0);

    return { inflows, outflows, net: inflows - outflows };
  }
}
