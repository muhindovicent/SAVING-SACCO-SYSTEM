import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getChartOfAccounts() {
    return this.prisma.chartOfAccount.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
  }

  async createAccount(dto: any) {
    const existing = await this.prisma.chartOfAccount.findUnique({
      where: { code: dto.code },
    });
    if (existing) throw new BadRequestException('Account code already exists');

    return this.prisma.chartOfAccount.create({
      data: {
        code: dto.code,
        name: dto.name,
        category: dto.category,
        subCategory: dto.subCategory,
        normalSide: dto.normalSide || 'DEBIT',
        description: dto.description,
        isActive: true,
      },
    });
  }

  async createJournalEntry(dto: any) {
    if (!dto.lines || dto.lines.length < 2) {
      throw new BadRequestException('Journal entry must have at least 2 lines');
    }

    const totalDebit = dto.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
    const totalCredit = dto.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Debits (${totalDebit.toFixed(2)}) must equal Credits (${totalCredit.toFixed(2)}). Difference: ${(totalDebit - totalCredit).toFixed(2)}`,
      );
    }

    const periodId = dto.periodId || await this.getOrCreatePeriod();

    return this.prisma.$transaction(async (tx) => {
      // Resolve account codes to IDs
      const linesWithIds = await Promise.all(
        dto.lines.map(async (line: any) => {
          const account = await tx.chartOfAccount.findUnique({
            where: { code: line.accountCode },
          });
          if (!account) throw new BadRequestException(`Account not found: ${line.accountCode}`);
          return {
            accountId: account.id,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description || '',
          };
        }),
      );

      const entry = await tx.journalEntry.create({
        data: {
          journalNo: dto.journalNo || `JE-${Date.now()}`,
          description: dto.description || 'Journal entry',
          entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
          totalDebit,
          totalCredit,
          periodId,
          reference: dto.reference,
          referenceId: dto.referenceId,
          refType: dto.refType || 'MANUAL',
          isReversal: dto.isReversal || false,
          postedBy: dto.postedBy || 'SYSTEM',
          lines: { create: linesWithIds },
        },
        include: { lines: true },
      });

      // Update general ledger balances
      await this.updateGeneralLedger(tx, periodId, linesWithIds);

      return entry;
    });
  }

  async getJournalEntries(pagination: { page: number; limit: number; source?: string }) {
    const { page, limit, source } = pagination;
    const where: any = {};
    if (source) where.refType = source;

    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { entryDate: 'desc' },
        include: { lines: { include: { account: true } }, period: true },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getJournalEntry(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: { include: { account: true } }, period: true },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    return entry;
  }

  async getGeneralLedger(filters: {
    accountCode?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};
    if (filters.accountCode) {
      const account = await this.prisma.chartOfAccount.findUnique({
        where: { code: filters.accountCode },
      });
      if (account) where.accountId = account.id;
    }
    if (filters.startDate || filters.endDate) {
      where.journalEntry = {};
      if (filters.startDate) where.journalEntry.entryDate = { gte: filters.startDate };
      if (filters.endDate) where.journalEntry.entryDate = {
        ...where.journalEntry.entryDate,
        lte: filters.endDate,
      };
    }

    const lines = await this.prisma.journalLine.findMany({
      where,
      include: { journalEntry: true, account: true },
      orderBy: [{ journalEntry: { entryDate: 'asc' } }, { id: 'asc' }],
    });

    let runningBalance = 0;
    const ledger: any[] = [];

    for (const line of lines) {
      const isDebitNormal = line.account.normalSide === 'DEBIT';
      const lineBalance = line.debit.toNumber() - line.credit.toNumber();
      runningBalance += isDebitNormal ? lineBalance : -lineBalance;

      ledger.push({
        date: line.journalEntry.entryDate,
        journalNo: line.journalEntry.journalNo,
        transactionId: line.journalEntry.reference,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
        balance: runningBalance,
        accountCode: line.account.code,
        accountName: line.account.name,
      });
    }

    return ledger;
  }

  async getTrialBalance(asAt: Date) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { entryDate: { lte: asAt }, isPosted: true },
      select: { id: true },
    });
    const entryIds = entries.map((e) => e.id);

    const lines = await this.prisma.journalLine.findMany({
      where: { journalId: { in: entryIds } },
      include: { account: true },
    });

    const accountBalances = new Map<string, { debit: number; credit: number }>();
    for (const line of lines) {
      const code = line.account.code;
      const current = accountBalances.get(code) || { debit: 0, credit: 0 };
      current.debit += line.debit.toNumber();
      current.credit += line.credit.toNumber();
      accountBalances.set(code, current);
    }

    const accounts = await this.prisma.chartOfAccount.findMany();
    const accountMap = new Map(accounts.map((a) => [a.code, a]));

    const trialBalance: any[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const [code, balances] of accountBalances) {
      const account = accountMap.get(code);
      const netBalance = balances.debit - balances.credit;

      trialBalance.push({
        accountCode: code,
        accountName: account?.name || code,
        category: account?.category,
        debit: netBalance > 0 ? netBalance : 0,
        credit: netBalance < 0 ? Math.abs(netBalance) : 0,
      });

      if (netBalance > 0) totalDebit += netBalance;
      else totalCredit += Math.abs(netBalance);
    }

    return {
      trialBalance,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  }

  async getIncomeStatement(startDate: Date, endDate: Date) {
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        entryDate: { gte: startDate, lte: endDate },
        isPosted: true,
      },
      select: { id: true },
    });
    const entryIds = entries.map((e) => e.id);

    const lines = await this.prisma.journalLine.findMany({
      where: { journalId: { in: entryIds } },
      include: { account: true },
    });

    // Income accounts have normal side CREDIT: credit increases balance, debit decreases
    // Expense accounts have normal side DEBIT: debit increases balance, credit decreases
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const line of lines) {
      const cat = line.account.category;
      const net = line.debit.toNumber() - line.credit.toNumber();

      if (cat === 'INCOME') {
        totalRevenue += -net; // credit-positive
      } else if (cat === 'EXPENSE') {
        totalExpenses += net; // debit-positive
      }
    }

    const revenue = Math.round(totalRevenue * 100) / 100;
    const expenses = Math.round(totalExpenses * 100) / 100;

    return {
      period: { startDate, endDate },
      totalRevenue: revenue,
      totalExpenses: expenses,
      netIncome: revenue - expenses,
      netIncomeMargin: revenue > 0
        ? (((revenue - expenses) / revenue) * 100).toFixed(2)
        : '0.00',
    };
  }

  async getBalanceSheet(asAt: Date) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { entryDate: { lte: asAt }, isPosted: true },
      select: { id: true },
    });
    const entryIds = entries.map((e) => e.id);

    const lines = await this.prisma.journalLine.findMany({
      where: { journalId: { in: entryIds } },
      include: { account: true },
    });

    const balances = new Map<string, number>();
    for (const line of lines) {
      const code = line.account.code;
      const current = balances.get(code) || 0;
      balances.set(code, current + line.debit.toNumber() - line.credit.toNumber());
    }

    const assets: any[] = [];
    const liabilities: any[] = [];
    const equity: any[] = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const [code, balance] of balances) {
      const account = await this.prisma.chartOfAccount.findUnique({ where: { code } });
      if (!account) continue;

      const cat = account.category;
      const isDebitNormal = account.normalSide === 'DEBIT';
      const actualBalance = isDebitNormal ? balance : -balance;

      const item = {
        accountCode: code,
        accountName: account.name,
        balance: Math.round(actualBalance * 100) / 100,
      };

      if (cat === 'ASSET') {
        assets.push(item);
        totalAssets += actualBalance;
      } else if (cat === 'LIABILITY') {
        liabilities.push(item);
        totalLiabilities += actualBalance;
      } else if (cat === 'EQUITY') {
        equity.push(item);
        totalEquity += actualBalance;
      }
    }

    totalAssets = Math.round(totalAssets * 100) / 100;
    totalLiabilities = Math.round(totalLiabilities * 100) / 100;
    totalEquity = Math.round(totalEquity * 100) / 100;

    return {
      asAt,
      assets: { items: assets, total: totalAssets },
      liabilities: { items: liabilities, total: totalLiabilities },
      equity: { items: equity, total: totalEquity },
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }

  async createFinancialPeriod(dto: any) {
    return this.prisma.financialPeriod.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isClosed: false,
      },
    });
  }

  async closePeriod(id: string) {
    const period = await this.prisma.financialPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException('Financial period not found');

    return this.prisma.financialPeriod.update({
      where: { id },
      data: { isClosed: true, closedAt: new Date() },
    });
  }

  private async updateGeneralLedger(
    tx: any,
    periodId: string,
    lines: { accountId: string; debit: number; credit: number }[],
  ) {
    for (const line of lines) {
      const existing = await tx.generalLedger.findUnique({
        where: { accountId_periodId: { accountId: line.accountId, periodId } },
      });

      if (existing) {
        await tx.generalLedger.update({
          where: { accountId_periodId: { accountId: line.accountId, periodId } },
          data: {
            debits: { increment: line.debit },
            credits: { increment: line.credit },
            closing: existing.opening.toNumber() + existing.debits.toNumber() + line.debit
              - existing.credits.toNumber() - line.credit,
          },
        });
      } else {
        const account = await tx.chartOfAccount.findUnique({ where: { id: line.accountId } });
        const isDebitNormal = account.normalSide === 'DEBIT';
        const closing = isDebitNormal ? line.debit - line.credit : line.credit - line.debit;

        await tx.generalLedger.create({
          data: {
            accountId: line.accountId,
            periodId,
            opening: 0,
            debits: line.debit,
            credits: line.credit,
            closing,
          },
        });
      }
    }
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
