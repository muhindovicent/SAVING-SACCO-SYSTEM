import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class TreasuryService {
  private readonly logger = new Logger(TreasuryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [cashPosition, pendingDisbursements, totalSavings, totalLoans, memberCount] = await Promise.all([
      this.getCashPosition(),
      this.getPendingDisbursements(),
      this.getTotalSavings(),
      this.getTotalLoanPortfolio(),
      this.prisma.member.count({ where: { isDeleted: false } }),
    ]);

    return {
      cashPosition,
      pendingDisbursements,
      totalSavings,
      totalLoanPortfolio: totalLoans,
      memberCount,
      liquidityRatio: totalSavings > 0
        ? ((cashPosition.cashBalance / totalSavings) * 100).toFixed(2)
        : '0.00',
    };
  }

  async getCashPosition() {
    const cashAccount = await this.prisma.chartOfAccount.findUnique({
      where: { code: 'CASH_AND_BANK' },
    });

    if (!cashAccount) {
      return { cashBalance: 0, totalIn: 0, totalOut: 0, asAt: new Date() };
    }

    const [debits, credits] = await Promise.all([
      this.prisma.journalLine.aggregate({
        where: { accountId: cashAccount.id },
        _sum: { debit: true },
      }),
      this.prisma.journalLine.aggregate({
        where: { accountId: cashAccount.id },
        _sum: { credit: true },
      }),
    ]);

    const totalIn = debits._sum.debit?.toNumber() || 0;
    const totalOut = credits._sum.credit?.toNumber() || 0;

    return {
      cashBalance: totalIn - totalOut,
      totalIn,
      totalOut,
      asAt: new Date(),
    };
  }

  async getPendingDisbursements() {
    const loans = await this.prisma.loanApplication.findMany({
      where: { status: 'APPROVED', isDeleted: false },
      include: {
        member: { select: { fullName: true, memberNumber: true } },
        product: true,
      },
      orderBy: { reviewedAt: 'asc' },
    });

    const totalPending = loans.reduce((sum, l) => sum + l.principal.toNumber(), 0);

    return { loans, totalPending, count: loans.length };
  }

  async getCollections() {
    const members = await this.prisma.member.findMany({
      where: { isDeleted: false },
      include: {
        loanApplications: {
          where: { status: { in: ['ACTIVE', 'OVERDUE'] }, isDeleted: false },
          include: { loan: true },
        },
        savingsAccounts: { where: { isDeleted: false } },
      },
    });

    const collections = members.map((m) => {
      const totalOutstanding = m.loanApplications.reduce(
        (s, app) => s + (app.loan?.balance.toNumber() || 0), 0,
      );
      const totalSavings = m.savingsAccounts.reduce(
        (s, a) => s + a.balance.toNumber(), 0,
      );

      return {
        memberNumber: m.memberNumber,
        fullName: m.fullName,
        activeLoans: m.loanApplications.length,
        totalSavings,
        totalOutstanding,
      };
    });

    const totalExpected = collections.reduce((s, c) => s + c.totalOutstanding, 0);
    const totalCollected = collections.reduce(
      (s, c) => s + Math.min(c.totalSavings * 0.1, c.totalOutstanding), 0,
    );

    return {
      collections,
      totalMembers: members.length,
      totalExpected,
      totalCollected,
      collectionRate: totalExpected > 0
        ? ((totalCollected / totalExpected) * 100).toFixed(2)
        : '0.00',
    };
  }

  async getRecentTransactions() {
    const [deposits, repayments] = await Promise.all([
      this.prisma.savingsTransaction.findMany({
        where: { type: 'DEPOSIT' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { account: { include: { member: { select: { fullName: true } } } } },
      }),
      this.prisma.loanRepayment.findMany({
        orderBy: { paidAt: 'desc' },
        take: 20,
        include: { loan: { include: { member: { select: { fullName: true } } } } },
      }),
    ]);

    const transactions = [
      ...deposits.map((d) => ({
        type: 'DEPOSIT' as const,
        amount: d.amount,
        memberName: d.account.member.fullName,
        reference: d.reference || '',
        date: d.createdAt,
      })),
      ...repayments.map((r) => ({
        type: 'REPAYMENT' as const,
        amount: r.amount,
        memberName: r.loan.member.fullName,
        reference: r.reference || '',
        date: r.paidAt,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 30);

    return transactions;
  }

  async reconcile(dto: any) {
    const periodId = await this.getOrCreatePeriod();

    return this.prisma.journalEntry.create({
      data: {
        journalNo: `JE-${Date.now()}-RECON`,
        description: `Treasury reconciliation: ${dto.notes || 'Periodic reconciliation'}`,
        entryDate: new Date(),
        totalDebit: dto.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0),
        totalCredit: dto.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0),
        reference: `RECON-${Date.now()}`,
        refType: 'RECONCILIATION',
        periodId,
        postedBy: 'SYSTEM',
        lines: {
          create: await Promise.all(
            dto.lines.map(async (line: any) => {
              const account = await this.prisma.chartOfAccount.findUnique({
                where: { code: line.accountCode },
              });
              if (!account) throw new Error(`Account not found: ${line.accountCode}`);
              return {
                accountId: account.id,
                debit: line.debit || 0,
                credit: line.credit || 0,
                description: line.description || '',
              };
            }),
          ),
        },
      },
    });
  }

  private async getTotalSavings(): Promise<number> {
    const result = await this.prisma.savingsAccount.aggregate({
      where: { isDeleted: false },
      _sum: { balance: true },
    });
    return result._sum.balance?.toNumber() || 0;
  }

  private async getTotalLoanPortfolio(): Promise<number> {
    const result = await this.prisma.loan.aggregate({
      where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
      _sum: { balance: true },
    });
    return result._sum.balance?.toNumber() || 0;
  }

  private async getOrCreatePeriod(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const periodName = `${year}-${month.toString().padStart(2, '0')}`;

    let period = await this.prisma.financialPeriod.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        isClosed: false,
      },
    });

    if (!period) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      period = await this.prisma.financialPeriod.create({
        data: { name: periodName, startDate, endDate, isClosed: false },
      });
    }

    return period.id;
  }
}
