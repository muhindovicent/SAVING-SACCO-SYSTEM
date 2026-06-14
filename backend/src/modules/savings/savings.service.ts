import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { SavingsAccountStatus, SavingsTransactionType, PaymentMethod } from '@prisma/client';

@Injectable()
export class SavingsService {
  private readonly logger = new Logger(SavingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async resolveMemberId(userId: string): Promise<string> {
    const member = await this.prisma.member.findUnique({ where: { userId } });
    if (!member) throw new NotFoundException('Member profile not found');
    return member.id;
  }

  async getProducts() {
    return this.prisma.savingsProduct.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createProduct(dto: any) {
    return this.prisma.savingsProduct.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        productType: dto.productType || 'REGULAR',
        minBalance: dto.minBalance || 0,
        maxBalance: dto.maxBalance,
        interestRate: dto.interestRate || 0,
        interestFreq: dto.interestFreq || 'MONTHLY',
        charges: dto.charges || [],
      },
    });
  }

  async getAccounts(memberId: string) {
    return this.prisma.savingsAccount.findMany({
      where: { memberId, isDeleted: false },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async openAccount(memberId: string, productId: string) {
    const product = await this.prisma.savingsProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Savings product not found');

    const existing = await this.prisma.savingsAccount.findFirst({
      where: { memberId, productId, isDeleted: false },
    });
    if (existing) throw new BadRequestException('Account already exists for this product');

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.savingsAccount.create({
        data: {
          memberId,
          productId,
          accountNumber: `SAV-${Date.now().toString(36).toUpperCase()}`,
          balance: 0,
          availableBalance: 0,
          lienAmount: 0,
          status: SavingsAccountStatus.ACTIVE,
        },
      });

      await tx.journalEntry.create({
        data: {
          journalNo: `JE-${Date.now()}`,
          description: `Savings account opened: ${product.name}`,
          entryDate: new Date(),
          totalDebit: 0,
          totalCredit: 0,
          periodId: await this.getOrCreatePeriod(tx),
          postedBy: 'SYSTEM',
          lines: {
            create: [],
          },
        },
      });

      return account;
    });
  }

  async deposit(memberId: string, dto: any) {
    const account = await this.prisma.savingsAccount.findFirst({
      where: { id: dto.accountId, memberId, isDeleted: false },
      include: { product: true },
    });
    if (!account) throw new NotFoundException('Savings account not found');

    if (account.status !== SavingsAccountStatus.ACTIVE) {
      throw new BadRequestException('Account is not active');
    }
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');

    const reference = `DEP-${Date.now()}`;
    const oldBalance = account.balance.toNumber();
    const newBalance = oldBalance + dto.amount;

    const charges = (account.product.charges as any[]) || [];
    const depositFee = charges.find((c: any) => c.type === 'DEPOSIT_FEE')?.amount || 0;

    return this.prisma.$transaction(async (tx) => {
      await tx.savingsAccount.update({
        where: { id: account.id },
        data: {
          balance: newBalance,
          availableBalance: { increment: dto.amount - depositFee },
          lastTransactionAt: new Date(),
        },
      });

      const txn = await tx.savingsTransaction.create({
        data: {
          accountId: account.id,
          type: SavingsTransactionType.DEPOSIT,
          amount: dto.amount,
          balanceBefore: oldBalance,
          balanceAfter: newBalance,
          reference,
          description: dto.description || 'Savings deposit',
          paymentMethod: (dto.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
          receiptNumber: reference,
        },
      });

      const periodId = await this.getOrCreatePeriod(tx);
      const journal = await tx.journalEntry.create({
        data: {
          journalNo: `JE-${Date.now()}`,
          description: `Savings deposit: ${account.accountNumber}`,
          entryDate: new Date(),
          totalDebit: dto.amount,
          totalCredit: dto.amount,
          reference,
          referenceId: txn.id,
          refType: 'DEPOSIT',
          periodId,
          postedBy: 'SYSTEM',
          lines: {
            create: [
              {
                accountId: await this.resolveAccountCode(tx, 'CASH_AND_BANK'),
                debit: dto.amount,
                credit: 0,
                description: 'Deposit from member',
              },
              {
                accountId: await this.resolveAccountCode(tx, 'MEMBER_SAVINGS'),
                debit: 0,
                credit: dto.amount,
                description: 'Member savings deposit',
              },
            ],
          },
        },
      });

      await tx.savingsTransaction.update({
        where: { id: txn.id },
        data: { journalId: journal.id },
      });

      await this.queue.publish('notifications.sms', {
        type: 'DEPOSIT_CONFIRMATION',
        amount: dto.amount,
        accountNumber: account.accountNumber,
        reference,
      });

      return txn;
    });
  }

  async withdraw(memberId: string, dto: any) {
    const account = await this.prisma.savingsAccount.findFirst({
      where: { id: dto.accountId, memberId, isDeleted: false },
      include: { product: true },
    });
    if (!account) throw new NotFoundException('Savings account not found');
    if (account.status !== SavingsAccountStatus.ACTIVE) {
      throw new BadRequestException('Account is not active');
    }

    const charges = (account.product.charges as any[]) || [];
    const withdrawalFee = charges.find((c: any) => c.type === 'WITHDRAWAL_FEE')?.amount || 0;
    const totalRequired = dto.amount + withdrawalFee;
    const availableBalance = account.availableBalance.toNumber();

    if (totalRequired > availableBalance) {
      throw new BadRequestException('Insufficient available balance');
    }

    const minBalance = account.product.minBalance.toNumber();
    if (minBalance > 0) {
      const remaining = availableBalance - totalRequired;
      if (remaining < minBalance) {
        throw new BadRequestException(`Minimum balance of ${minBalance} must be maintained`);
      }
    }

    const reference = `WTH-${Date.now()}`;
    const oldBalance = account.balance.toNumber();

    return this.prisma.$transaction(async (tx) => {
      await tx.savingsAccount.update({
        where: { id: account.id },
        data: {
          balance: { decrement: totalRequired },
          availableBalance: { decrement: totalRequired },
          lastTransactionAt: new Date(),
        },
      });

      const txn = await tx.savingsTransaction.create({
        data: {
          accountId: account.id,
          type: SavingsTransactionType.WITHDRAWAL,
          amount: dto.amount,
          balanceBefore: oldBalance,
          balanceAfter: oldBalance - totalRequired,
          reference,
          description: dto.description || 'Savings withdrawal',
          paymentMethod: (dto.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
        },
      });

      const periodId = await this.getOrCreatePeriod(tx);
      const journal = await tx.journalEntry.create({
        data: {
          journalNo: `JE-${Date.now()}`,
          description: `Savings withdrawal: ${account.accountNumber}`,
          entryDate: new Date(),
          totalDebit: dto.amount + withdrawalFee,
          totalCredit: dto.amount + withdrawalFee,
          reference,
          referenceId: txn.id,
          refType: 'WITHDRAWAL',
          periodId,
          postedBy: 'SYSTEM',
          lines: {
            create: [
              {
                accountId: await this.resolveAccountCode(tx, 'MEMBER_SAVINGS'),
                debit: dto.amount,
                credit: 0,
                description: 'Member savings withdrawal',
              },
              {
                accountId: await this.resolveAccountCode(tx, 'CASH_AND_BANK'),
                debit: 0,
                credit: dto.amount,
                description: 'Payout to member',
              },
              ...(withdrawalFee > 0 ? [{
                accountId: await this.resolveAccountCode(tx, 'FEE_INCOME'),
                debit: 0,
                credit: withdrawalFee,
                description: 'Withdrawal fee',
              }] : []),
            ],
          },
        },
      });

      await tx.savingsTransaction.update({
        where: { id: txn.id },
        data: { journalId: journal.id },
      });

      return txn;
    });
  }

  async getGoals(memberId: string) {
    const accounts = await this.prisma.savingsAccount.findMany({
      where: { memberId, isDeleted: false },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    return this.prisma.savingsGoal.findMany({
      where: { accountId: { in: accountIds } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGoal(memberId: string, dto: any) {
    const account = await this.prisma.savingsAccount.findFirst({
      where: { id: dto.accountId, memberId, isDeleted: false },
    });
    if (!account) throw new NotFoundException('Savings account not found');

    return this.prisma.savingsGoal.create({
      data: {
        accountId: account.id,
        name: dto.name,
        targetAmount: dto.targetAmount,
        currentAmount: 0,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        autoAllocate: dto.autoAllocate,
      },
    });
  }

  async contributeToGoal(memberId: string, goalId: string, amount: number) {
    const accounts = await this.prisma.savingsAccount.findMany({
      where: { memberId, isDeleted: false },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    const goal = await this.prisma.savingsGoal.findFirst({
      where: { id: goalId, accountId: { in: accountIds } },
    });
    if (!goal) throw new NotFoundException('Savings goal not found');
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const newAmount = goal.currentAmount.toNumber() + amount;
    const achieved = goal.targetAmount.toNumber() <= newAmount;

    return this.prisma.savingsGoal.update({
      where: { id: goalId },
      data: {
        currentAmount: newAmount,
        ...(achieved ? { achievedAt: new Date() } : {}),
      },
    });
  }

  async getTransactions(memberId: string, pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const accounts = await this.prisma.savingsAccount.findMany({
      where: { memberId, isDeleted: false },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    const [data, total] = await Promise.all([
      this.prisma.savingsTransaction.findMany({
        where: { accountId: { in: accountIds } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { account: { include: { product: true } } },
      }),
      this.prisma.savingsTransaction.count({
        where: { accountId: { in: accountIds } },
      }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private async getOrCreatePeriod(tx: any): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const periodName = `${year}-${month.toString().padStart(2, '0')}`;

    let period = await tx.financialPeriod.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        isClosed: false,
      },
    });

    if (!period) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      period = await tx.financialPeriod.create({
        data: {
          name: periodName,
          startDate,
          endDate,
          isClosed: false,
        },
      });
    }

    return period.id;
  }

  private async resolveAccountCode(tx: any, code: string): Promise<string> {
    const account = await tx.chartOfAccount.findUnique({ where: { code } });
    if (account) return account.id;

    // Auto-create standard accounts if they don't exist
    const standardAccounts: Record<string, { name: string; category: string; subCategory: string; normalSide: string }> = {
      CASH_AND_BANK: { name: 'Cash & Bank', category: 'ASSET', subCategory: 'CURRENT_ASSET', normalSide: 'DEBIT' },
      MEMBER_SAVINGS: { name: 'Member Savings', category: 'LIABILITY', subCategory: 'CURRENT_LIABILITY', normalSide: 'CREDIT' },
      FEE_INCOME: { name: 'Fee Income', category: 'INCOME', subCategory: 'FEE_INCOME', normalSide: 'CREDIT' },
      LOANS_RECEIVABLE: { name: 'Loans Receivable', category: 'ASSET', subCategory: 'CURRENT_ASSET', normalSide: 'DEBIT' },
      INTEREST_INCOME: { name: 'Interest Income', category: 'INCOME', subCategory: 'INTEREST_INCOME', normalSide: 'CREDIT' },
      SHARE_CAPITAL: { name: 'Share Capital', category: 'EQUITY', subCategory: 'SHARE_CAPITAL', normalSide: 'CREDIT' },
      RETAINED_EARNINGS: { name: 'Retained Earnings', category: 'EQUITY', subCategory: 'RETAINED_EARNINGS', normalSide: 'CREDIT' },
      LOAN_FUND_RESERVE: { name: 'Loan Fund Reserve', category: 'LIABILITY', subCategory: 'RESERVES', normalSide: 'CREDIT' },
      DIVIDENDS_PAYABLE: { name: 'Dividends Payable', category: 'LIABILITY', subCategory: 'CURRENT_LIABILITY', normalSide: 'CREDIT' },
    };

    const def = standardAccounts[code];
    if (def) {
      const created = await tx.chartOfAccount.create({
        data: {
          code,
          name: def.name,
          category: def.category as any,
          subCategory: def.subCategory as any,
          normalSide: def.normalSide,
          isActive: true,
        },
      });
      return created.id;
    }

    throw new BadRequestException(`Chart of account not found: ${code}`);
  }
}
