import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { LoanStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

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
    return this.prisma.loanProduct.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createProduct(dto: any) {
    return this.prisma.loanProduct.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        productType: dto.productType || 'REGULAR',
        minAmount: dto.minAmount || 0,
        maxAmount: dto.maxAmount,
        interestRate: dto.interestRate,
        interestMethod: dto.interestMethod || 'FLAT',
        repaymentPeriod: dto.repaymentPeriod,
        repaymentFreq: dto.repaymentFreq || 'MONTHLY',
        gracePeriod: dto.gracePeriod || 0,
        latePenaltyRate: dto.latePenaltyRate,
        latePenaltyFixed: dto.latePenaltyFixed,
        processingFee: dto.processingFee,
        requiresGuarantor: dto.requiresGuarantor || false,
        requiresCollateral: dto.requiresCollateral || false,
        maxGuarantors: dto.maxGuarantors || 2,
      },
    });
  }

  async apply(memberId: string, dto: any) {
    const product = await this.prisma.loanProduct.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Loan product not found');

    if (dto.principal < product.minAmount.toNumber()) {
      throw new BadRequestException(`Minimum loan amount is ${product.minAmount}`);
    }
    if (product.maxAmount && dto.principal > product.maxAmount.toNumber()) {
      throw new BadRequestException(`Maximum loan amount is ${product.maxAmount}`);
    }

    const activeLoans = await this.prisma.loan.count({
      where: { memberId, status: { in: ['ACTIVE', 'OVERDUE'] } },
    });
    if (activeLoans >= 3) {
      throw new BadRequestException('Maximum of 3 active loans allowed');
    }

    const interestAmount = this.calculateInterest(
      dto.principal, product.interestRate.toNumber(),
      product.interestMethod, product.repaymentPeriod,
    );
    const feeAmount = product.processingFee
      ? dto.principal * (product.processingFee.toNumber() / 100)
      : 0;
    const totalAmount = dto.principal + interestAmount + feeAmount;
    const installments = product.repaymentPeriod;
    const installmentAmount = Math.ceil(totalAmount / installments);

    const applicationNo = `LN-${Date.now().toString(36).toUpperCase()}`;
    const periodId = await this.getOrCreatePeriod();

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.loanApplication.create({
        data: {
          memberId,
          productId: dto.productId,
          applicationNo,
          principal: dto.principal,
          purpose: dto.purpose,
          repaymentPeriod: product.repaymentPeriod,
          status: LoanStatus.PENDING,
          submittedAt: new Date(),
        },
      });

      // Journal entry for application (informational)
      await tx.journalEntry.create({
        data: {
          journalNo: `JE-${Date.now()}-APP`,
          description: `Loan application: ${applicationNo}`,
          entryDate: new Date(),
          totalDebit: 0,
          totalCredit: 0,
          reference: applicationNo,
          referenceId: application.id,
          refType: 'LOAN_APPLICATION',
          periodId,
          postedBy: 'SYSTEM',
          lines: { create: [] },
        },
      });

      // Create guarantors if provided
      if (dto.guarantors?.length) {
        for (const g of dto.guarantors) {
          await tx.loanGuarantor.create({
            data: {
              applicationId: application.id,
              guarantorId: g.memberId,
              amount: g.amount,
              approved: false,
            },
          });
        }
      }

      // Create collateral if provided
      if (dto.collateral) {
        await tx.loanCollateral.create({
          data: {
            applicationId: application.id,
            type: dto.collateral.type,
            description: dto.collateral.description,
            estimatedValue: dto.collateral.estimatedValue,
          },
        });
      }

      await this.queue.publish('notifications.email', {
        type: 'LOAN_APPLICATION_SUBMITTED',
        applicationNo,
        amount: dto.principal,
      });

      return application;
    });
  }

  async getApplications(memberId: string, status?: string) {
    const where: any = { memberId, isDeleted: false };
    if (status) where.status = status;

    return this.prisma.loanApplication.findMany({
      where,
      include: {
        product: true,
        loan: { include: { schedules: { orderBy: { installment: 'asc' } }, repayments: true } },
        guarantors: true,
        collaterals: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getPending(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.loanApplication.findMany({
        where: { status: LoanStatus.PENDING, isDeleted: false },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { submittedAt: 'asc' },
        include: {
          product: true,
          member: { select: { fullName: true, memberNumber: true } },
          guarantors: true,
        },
      }),
      this.prisma.loanApplication.count({
        where: { status: LoanStatus.PENDING, isDeleted: false },
      }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAll(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.loanApplication.findMany({
        where: { isDeleted: false },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          product: true,
          member: { select: { fullName: true, memberNumber: true } },
          loan: true,
        },
      }),
      this.prisma.loanApplication.count({ where: { isDeleted: false } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approve(id: string, userId: string) {
    const application = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!application) throw new NotFoundException('Loan application not found');
    if (application.status !== LoanStatus.PENDING) {
      throw new BadRequestException('Loan is not pending approval');
    }

    const product = application.product;
    const interestAmount = this.calculateInterest(
      application.principal.toNumber(), product.interestRate.toNumber(),
      product.interestMethod, application.repaymentPeriod,
    );
    const feeAmount = product.processingFee
      ? application.principal.toNumber() * (product.processingFee.toNumber() / 100)
      : 0;
    const totalAmount = application.principal.toNumber() + interestAmount + feeAmount;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.loanApplication.update({
        where: { id },
        data: {
          status: LoanStatus.APPROVED,
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });

      await tx.journalEntry.create({
        data: {
          journalNo: `JE-${Date.now()}-APPR`,
          description: `Loan approved: ${application.applicationNo}`,
          entryDate: new Date(),
          totalDebit: totalAmount,
          totalCredit: totalAmount,
          reference: application.applicationNo,
          referenceId: application.id,
          refType: 'LOAN_APPROVAL',
          periodId: await this.getOrCreatePeriod(tx),
          postedBy: userId,
          lines: {
            create: [
              {
                accountId: await this.resolveAccountCode(tx, 'LOANS_RECEIVABLE'),
                debit: totalAmount,
                credit: 0,
                description: 'Loan approval commitment',
              },
              {
                accountId: await this.resolveAccountCode(tx, 'LOAN_FUND_RESERVE'),
                debit: 0,
                credit: totalAmount,
                description: 'Loan commitment reserve',
              },
            ],
          },
        },
      });

      await this.queue.publish('notifications.email', {
        type: 'LOAN_APPROVED',
        applicationNo: application.applicationNo,
        amount: application.principal,
      });

      return updated;
    });
  }

  async reject(id: string, reason: string) {
    const application = await this.prisma.loanApplication.findUnique({
      where: { id },
    });
    if (!application) throw new NotFoundException('Loan application not found');
    if (application.status !== LoanStatus.PENDING) {
      throw new BadRequestException('Loan is not pending');
    }

    return this.prisma.loanApplication.update({
      where: { id },
      data: {
        status: LoanStatus.REJECTED,
        rejectionReason: reason,
        reviewedAt: new Date(),
      },
    });
  }

  async disburse(id: string) {
    const application = await this.prisma.loanApplication.findUnique({
      where: { id, status: LoanStatus.APPROVED },
      include: { product: true, member: true },
    });
    if (!application) throw new NotFoundException('Approved loan not found');

    const product = application.product;
    const interestAmount = this.calculateInterest(
      application.principal.toNumber(), product.interestRate.toNumber(),
      product.interestMethod, application.repaymentPeriod,
    );
    const feeAmount = product.processingFee
      ? application.principal.toNumber() * (product.processingFee.toNumber() / 100)
      : 0;
    const totalAmount = application.principal.toNumber() + interestAmount + feeAmount;
    const installments = application.repaymentPeriod;
    const installmentAmount = Math.ceil(totalAmount / installments);
    const loanNo = `LN-ACT-${Date.now().toString(36).toUpperCase()}`;
    const periodId = await this.getOrCreatePeriod();

    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          applicationId: application.id,
          memberId: application.memberId,
          loanNo,
          principal: application.principal,
          interestRate: product.interestRate,
          interestMethod: product.interestMethod,
          totalInterest: interestAmount,
          totalAmount,
          amountPaid: 0,
          balance: totalAmount,
          repaymentPeriod: application.repaymentPeriod,
          repaymentFreq: product.repaymentFreq,
          disbursedAt: new Date(),
          disbursedBy: 'SYSTEM',
          firstDueDate: this.calcFirstDueDate(product.repaymentFreq),
          lastDueDate: this.calcLastDueDate(product.repaymentFreq, application.repaymentPeriod),
          status: LoanStatus.ACTIVE,
        },
      });

      // Create repayment schedule
      const schedule = [];
      let dueDate = new Date();
      for (let i = 1; i <= installments; i++) {
        dueDate = this.calcNextDueDate(dueDate, product.repaymentFreq);
        schedule.push({
          loanId: loan.id,
          installment: i,
          dueDate,
          principal: Math.round(application.principal.toNumber() / installments),
          interest: Math.round(interestAmount / installments),
          fees: i === 1 ? Math.round(feeAmount) : 0,
          totalAmount: installmentAmount,
          paidAmount: 0,
          balance: totalAmount - (installmentAmount * i),
          status: 'PENDING',
        });
      }
      await tx.loanSchedule.createMany({ data: schedule });

      // Update application status
      await tx.loanApplication.update({
        where: { id: application.id },
        data: { status: LoanStatus.ACTIVE },
      });

      // Disbursement journal entry
      await tx.journalEntry.create({
        data: {
          journalNo: `JE-${Date.now()}-DISB`,
          description: `Loan disbursement: ${loanNo}`,
          entryDate: new Date(),
          totalDebit: totalAmount,
          totalCredit: totalAmount,
          reference: loanNo,
          referenceId: loan.id,
          refType: 'LOAN_DISBURSEMENT',
          periodId,
          postedBy: 'SYSTEM',
          lines: {
            create: [
              {
                accountId: await this.resolveAccountCode(tx, 'LOANS_RECEIVABLE'),
                debit: 0,
                credit: totalAmount,
                description: 'Disbursement reversal of commitment',
              },
              {
                accountId: await this.resolveAccountCode(tx, 'CASH_AND_BANK'),
                debit: 0,
                credit: application.principal.toNumber(),
                description: 'Disbursement to member',
              },
              {
                accountId: await this.resolveAccountCode(tx, 'INTEREST_INCOME'),
                debit: 0,
                credit: interestAmount,
                description: 'Loan interest receivable',
              },
              ...(feeAmount > 0 ? [{
                accountId: await this.resolveAccountCode(tx, 'FEE_INCOME'),
                debit: 0,
                credit: feeAmount,
                description: 'Processing fee',
              }] : []),
            ],
          },
        },
      });

      await this.queue.publish('notifications.sms', {
        type: 'LOAN_DISBURSED',
        loanNo,
        amount: application.principal,
      });

      return loan;
    });
  }

  async repay(id: string, memberId: string, dto: any) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, memberId, status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
    });
    if (!loan) throw new NotFoundException('Active loan not found');
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');

    const outstandingBalance = loan.balance.toNumber();
    if (dto.amount > outstandingBalance) {
      throw new BadRequestException('Amount exceeds outstanding balance');
    }

    const receiptRef = `REPAY-${Date.now()}`;
    const periodId = await this.getOrCreatePeriod();

    return this.prisma.$transaction(async (tx) => {
      // Determine principal vs interest portions
      const totalInterest = loan.totalInterest.toNumber();
      const totalPrincipal = loan.principal.toNumber();
      const totalInst = totalPrincipal + totalInterest;

      let principalPortion: number;
      let interestPortion: number;

      if (loan.interestMethod === 'FLAT') {
        const interestPct = totalInterest / totalInst;
        interestPortion = Math.round(dto.amount * interestPct);
        principalPortion = dto.amount - interestPortion;
      } else {
        // Reducing balance - prioritize interest
        const interestRate = loan.interestRate.toNumber() / 100 / 12;
        interestPortion = Math.round(outstandingBalance * interestRate);
        principalPortion = dto.amount - interestPortion;
      }

      const repayment = await tx.loanRepayment.create({
        data: {
          loanId: loan.id,
          memberId,
          amount: dto.amount,
          principalPortion,
          interestPortion,
          penaltyPortion: 0,
          paymentMethod: (dto.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
          reference: receiptRef,
          receivedBy: memberId,
          notes: dto.notes,
        },
      });

      const newBalance = outstandingBalance - dto.amount;
      const isPaidOff = newBalance <= 0;

      await tx.loan.update({
        where: { id: loan.id },
        data: {
          amountPaid: { increment: dto.amount },
          balance: isPaidOff ? 0 : newBalance,
          status: isPaidOff ? LoanStatus.PAID : loan.status,
          ...(isPaidOff ? { paidAt: new Date() } : {}),
        },
      });

      // Update schedule
      await tx.loanSchedule.updateMany({
        where: { loanId: loan.id, status: { in: ['PENDING', 'PARTIAL'] } },
        data: {
          paidAmount: { increment: dto.amount },
          balance: { decrement: dto.amount },
          ...(isPaidOff ? { status: 'PAID', paidAt: new Date() } : {}),
        },
      });

      // Journal entry
      await tx.journalEntry.create({
        data: {
          journalNo: `JE-${Date.now()}-REPAY`,
          description: `Loan repayment: ${loan.loanNo}`,
          entryDate: new Date(),
          totalDebit: dto.amount,
          totalCredit: dto.amount,
          reference: receiptRef,
          referenceId: loan.id,
          refType: 'LOAN_REPAYMENT',
          periodId,
          postedBy: 'SYSTEM',
          lines: {
            create: [
              {
                accountId: await this.resolveAccountCode(tx, 'CASH_AND_BANK'),
                debit: dto.amount,
                credit: 0,
                description: 'Repayment received',
              },
              {
                accountId: await this.resolveAccountCode(tx, 'LOANS_RECEIVABLE'),
                debit: 0,
                credit: principalPortion,
                description: 'Principal reduction',
              },
              {
                accountId: await this.resolveAccountCode(tx, 'INTEREST_INCOME'),
                debit: 0,
                credit: interestPortion,
                description: 'Interest income recognized',
              },
            ],
          },
        },
      });

      return repayment;
    });
  }

  async getSchedule(id: string) {
    const schedule = await this.prisma.loanSchedule.findMany({
      where: { loanId: id },
      orderBy: { installment: 'asc' },
    });
    if (!schedule.length) throw new NotFoundException('Loan schedule not found');
    return schedule;
  }

  async getStatistics() {
    const [totalApps, activeLoans, pendingApps, paidLoans, overdueLoans] = await Promise.all([
      this.prisma.loanApplication.count({ where: { isDeleted: false } }),
      this.prisma.loan.count({ where: { status: LoanStatus.ACTIVE } }),
      this.prisma.loanApplication.count({ where: { status: LoanStatus.PENDING, isDeleted: false } }),
      this.prisma.loan.count({ where: { status: LoanStatus.PAID } }),
      this.prisma.loan.count({ where: { status: LoanStatus.OVERDUE } }),
    ]);

    const activeLoanData = await this.prisma.loan.findMany({
      where: { status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
      select: { principal: true, balance: true, totalAmount: true },
    });

    const totalDisbursed = activeLoanData.reduce((s, l) => s + l.principal.toNumber(), 0);
    const totalOutstanding = activeLoanData.reduce((s, l) => s + l.balance.toNumber(), 0);
    const totalExpected = activeLoanData.reduce((s, l) => s + l.totalAmount.toNumber(), 0);

    return {
      totalApplications: totalApps,
      activeLoans,
      pendingApplications: pendingApps,
      paidLoans,
      overdueLoans,
      totalDisbursed,
      totalOutstanding,
      totalExpected,
      collectionRate: totalExpected > 0
        ? ((totalExpected - totalOutstanding) / totalExpected * 100).toFixed(2)
        : '100.00',
    };
  }

  private calculateInterest(principal: number, rate: number, method: string, period: number): number {
    if (method === 'FLAT') {
      const annualRate = rate / 100;
      const years = period / 12;
      return principal * annualRate * years;
    } else if (method === 'REDUCING') {
      const monthlyRate = rate / 100 / 12;
      const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, period))
        / (Math.pow(1 + monthlyRate, period) - 1);
      return (payment * period) - principal;
    }
    return 0;
  }

  private calcFirstDueDate(freq: string): Date {
    const d = new Date();
    if (freq === 'MONTHLY') d.setMonth(d.getMonth() + 1);
    else if (freq === 'WEEKLY') d.setDate(d.getDate() + 7);
    return d;
  }

  private calcLastDueDate(freq: string, period: number): Date {
    const d = new Date();
    if (freq === 'MONTHLY') d.setMonth(d.getMonth() + period);
    else if (freq === 'WEEKLY') d.setDate(d.getDate() + 7 * period);
    return d;
  }

  private calcNextDueDate(current: Date, freq: string): Date {
    const d = new Date(current);
    if (freq === 'MONTHLY') d.setMonth(d.getMonth() + 1);
    else if (freq === 'WEEKLY') d.setDate(d.getDate() + 7);
    return d;
  }

  private async getOrCreatePeriod(tx?: any): Promise<string> {
    const client = tx || this.prisma;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const periodName = `${year}-${month.toString().padStart(2, '0')}`;

    let period = await client.financialPeriod.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        isClosed: false,
      },
    });

    if (!period) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      period = await client.financialPeriod.create({
        data: { name: periodName, startDate, endDate, isClosed: false },
      });
    }

    return period.id;
  }

  private async resolveAccountCode(tx: any, code: string): Promise<string> {
    const account = await tx.chartOfAccount.findUnique({ where: { code } });
    if (account) return account.id;

    const standardAccounts: Record<string, { name: string; category: string; subCategory: string; normalSide: string }> = {
      CASH_AND_BANK: { name: 'Cash & Bank', category: 'ASSET', subCategory: 'CURRENT_ASSET', normalSide: 'DEBIT' },
      LOANS_RECEIVABLE: { name: 'Loans Receivable', category: 'ASSET', subCategory: 'CURRENT_ASSET', normalSide: 'DEBIT' },
      INTEREST_INCOME: { name: 'Interest Income', category: 'INCOME', subCategory: 'INTEREST_INCOME', normalSide: 'CREDIT' },
      FEE_INCOME: { name: 'Fee Income', category: 'INCOME', subCategory: 'FEE_INCOME', normalSide: 'CREDIT' },
      LOAN_FUND_RESERVE: { name: 'Loan Fund Reserve', category: 'LIABILITY', subCategory: 'RESERVES', normalSide: 'CREDIT' },
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
