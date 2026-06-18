import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { LoanStatus, PaymentMethod } from '@prisma/client';
import { InterestCalculatorFactory, InterestCalculationInput } from './engine';
import { CreateLoanProductDto, UpdateLoanProductDto } from './dto/create-loan-product.dto';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { RepayLoanDto } from './dto/repay-loan.dto';

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

  // ═══════════════════════════════════════════════════════════
  // LOAN PRODUCTS
  // ═══════════════════════════════════════════════════════════

  async getProducts() {
    return this.prisma.loanProduct.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getAllProducts() {
    return this.prisma.loanProduct.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getProduct(id: string) {
    const product = await this.prisma.loanProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Loan product not found');
    return product;
  }

  async createProduct(dto: CreateLoanProductDto) {
    const existing = await this.prisma.loanProduct.findUnique({ where: { code: dto.code } });
    if (existing) throw new BadRequestException(`Product code "${dto.code}" already exists`);

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

  async updateProduct(id: string, dto: UpdateLoanProductDto) {
    const product = await this.prisma.loanProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Loan product not found');

    return this.prisma.loanProduct.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.productType !== undefined && { productType: dto.productType }),
        ...(dto.minAmount !== undefined && { minAmount: dto.minAmount }),
        ...(dto.maxAmount !== undefined && { maxAmount: dto.maxAmount }),
        ...(dto.interestRate !== undefined && { interestRate: dto.interestRate }),
        ...(dto.interestMethod !== undefined && { interestMethod: dto.interestMethod }),
        ...(dto.repaymentPeriod !== undefined && { repaymentPeriod: dto.repaymentPeriod }),
        ...(dto.repaymentFreq !== undefined && { repaymentFreq: dto.repaymentFreq }),
        ...(dto.gracePeriod !== undefined && { gracePeriod: dto.gracePeriod }),
        ...(dto.latePenaltyRate !== undefined && { latePenaltyRate: dto.latePenaltyRate }),
        ...(dto.latePenaltyFixed !== undefined && { latePenaltyFixed: dto.latePenaltyFixed }),
        ...(dto.processingFee !== undefined && { processingFee: dto.processingFee }),
        ...(dto.requiresGuarantor !== undefined && { requiresGuarantor: dto.requiresGuarantor }),
        ...(dto.requiresCollateral !== undefined && { requiresCollateral: dto.requiresCollateral }),
        ...(dto.maxGuarantors !== undefined && { maxGuarantors: dto.maxGuarantors }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async toggleProduct(id: string) {
    const product = await this.prisma.loanProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Loan product not found');

    return this.prisma.loanProduct.update({
      where: { id },
      data: { isActive: !product.isActive },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // CALCULATION ENGINE
  // ═══════════════════════════════════════════════════════════

  async calculateLoan(
    principal: number,
    interestRate: number,
    durationMonths: number,
    interestMethod: string,
    processingFee: number,
  ) {
    const strategy = InterestCalculatorFactory.getStrategy(interestMethod);
    const input: InterestCalculationInput = { principal, interestRate, durationMonths };
    const result = strategy.calculate(input);

    const feeAmount = processingFee ? principal * (processingFee / 100) : 0;
    const totalPayable = result.totalAmount + feeAmount;

    return {
      principal,
      interestRate,
      interestMethod: strategy.name,
      durationMonths,
      processingFee: processingFee ? processingFee : 0,
      processingFeeAmount: feeAmount,
      interestAmount: result.interestAmount,
      totalAmount: result.totalAmount,
      totalPayable,
      monthlyInstallment: result.monthlyInstallment,
      schedule: result.schedule,
    };
  }

  async getInterestMethods() {
    return InterestCalculatorFactory.getAvailableStrategies();
  }

  private calculateInterest(
    principal: number,
    rate: number,
    method: string,
    period: number,
  ): { interestAmount: number; totalAmount: number; monthlyInstallment: number; schedule: any[] } {
    try {
      const strategy = InterestCalculatorFactory.getStrategy(method);
      const input: InterestCalculationInput = { principal, interestRate: rate, durationMonths: period };
      return strategy.calculate(input);
    } catch {
      // Fallback
      const interestAmount = principal * (rate / 100) * (period / 12);
      const totalAmount = principal + interestAmount;
      const monthlyInstallment = Math.ceil(totalAmount / period);
      return { interestAmount, totalAmount, monthlyInstallment, schedule: [] };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // LOAN APPLICATIONS
  // ═══════════════════════════════════════════════════════════

  async apply(memberId: string, dto: ApplyLoanDto) {
    const product = await this.prisma.loanProduct.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Loan product not found');
    if (!product.isActive) throw new BadRequestException('Loan product is not active');

    if (dto.principal < product.minAmount.toNumber()) {
      throw new BadRequestException(`Minimum loan amount is UGX ${product.minAmount.toNumber().toLocaleString()}`);
    }
    if (product.maxAmount && dto.principal > product.maxAmount.toNumber()) {
      throw new BadRequestException(`Maximum loan amount is UGX ${product.maxAmount.toNumber().toLocaleString()}`);
    }

    const duration = dto.repaymentPeriod || product.repaymentPeriod;
    if (duration > product.repaymentPeriod) {
      throw new BadRequestException(`Maximum repayment period is ${product.repaymentPeriod} months`);
    }

    const activeLoans = await this.prisma.loan.count({
      where: { memberId, status: { in: ['ACTIVE', 'OVERDUE'] } },
    });
    if (activeLoans >= 3) {
      throw new BadRequestException('Maximum of 3 active loans allowed');
    }

    const calc = this.calculateInterest(
      dto.principal,
      product.interestRate.toNumber(),
      product.interestMethod,
      duration,
    );

    const feeRate = product.processingFee ? product.processingFee.toNumber() : 0;
    const feeAmount = feeRate ? dto.principal * (feeRate / 100) : 0;
    const totalPayable = calc.totalAmount + feeAmount;

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
          repaymentPeriod: duration,
          status: LoanStatus.PENDING,
          submittedAt: new Date(),
        },
      });

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

      return {
        ...application,
        calculation: {
          principal: dto.principal,
          interestRate: product.interestRate.toNumber(),
          interestMethod: product.interestMethod,
          interestAmount: calc.interestAmount,
          processingFee: feeRate,
          processingFeeAmount: feeAmount,
          totalAmount: calc.totalAmount,
          totalPayable,
          durationMonths: duration,
          monthlyInstallment: calc.monthlyInstallment,
        },
      };
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
          member: { select: { fullName: true, memberNumber: true, email: true, phonePrimary: true } },
          guarantors: true,
          collaterals: true,
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

  async getActiveLoans(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.loan.findMany({
        where: { status: LoanStatus.ACTIVE },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          member: { select: { fullName: true, memberNumber: true } },
          application: { include: { product: true } },
          schedules: { orderBy: { installment: 'asc' } },
        },
      }),
      this.prisma.loan.count({ where: { status: LoanStatus.ACTIVE } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOverdueLoans(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const [data, total] = await Promise.all([
      this.prisma.loan.findMany({
        where: { status: LoanStatus.OVERDUE },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          member: { select: { fullName: true, memberNumber: true } },
          application: { include: { product: true } },
          penalties: true,
          schedules: { where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
        },
      }),
      this.prisma.loan.count({ where: { status: LoanStatus.OVERDUE } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ═══════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW
  // ═══════════════════════════════════════════════════════════

  async approve(id: string, userId: string) {
    const application = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: { product: true, member: true },
    });
    if (!application) throw new NotFoundException('Loan application not found');
    if (application.status !== LoanStatus.PENDING) {
      throw new BadRequestException('Loan is not pending approval');
    }

    const product = application.product;
    const duration = application.repaymentPeriod;
    const calc = this.calculateInterest(
      application.principal.toNumber(),
      product.interestRate.toNumber(),
      product.interestMethod,
      duration,
    );
    const feeRate = product.processingFee ? product.processingFee.toNumber() : 0;
    const feeAmount = feeRate ? application.principal.toNumber() * (feeRate / 100) : 0;
    const totalPayable = calc.totalAmount + feeAmount;

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
          totalDebit: totalPayable,
          totalCredit: totalPayable,
          reference: application.applicationNo,
          referenceId: application.id,
          refType: 'LOAN_APPROVAL',
          periodId: await this.getOrCreatePeriod(tx),
          postedBy: userId,
          lines: {
            create: [
              {
                accountId: await this.resolveAccountCode(tx, 'LOANS_RECEIVABLE'),
                debit: totalPayable,
                credit: 0,
                description: 'Loan approval commitment',
              },
              {
                accountId: await this.resolveAccountCode(tx, 'LOAN_FUND_RESERVE'),
                debit: 0,
                credit: totalPayable,
                description: 'Loan commitment reserve',
              },
            ],
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'LOAN_APPROVED',
          entityType: 'LoanApplication',
          entityId: application.id,
          oldValue: JSON.stringify({ status: LoanStatus.PENDING }),
          newValue: JSON.stringify({ status: LoanStatus.APPROVED, amount: application.principal, totalPayable }),
          ipAddress: 'SYSTEM',
          userAgent: 'SYSTEM',
        },
      });

      await this.queue.publish('notifications.email', {
        type: 'LOAN_APPROVED',
        applicationNo: application.applicationNo,
        amount: application.principal,
        memberEmail: application.member?.email,
      });

      return {
        ...updated,
        calculation: {
          principal: application.principal,
          interestRate: product.interestRate,
          interestMethod: product.interestMethod,
          interestAmount: calc.interestAmount,
          processingFee: feeRate,
          processingFeeAmount: feeAmount,
          totalAmount: calc.totalAmount,
          totalPayable,
          monthlyInstallment: calc.monthlyInstallment,
        },
      };
    });
  }

  async reject(id: string, reason: string) {
    const application = await this.prisma.loanApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('Loan application not found');
    if (application.status !== LoanStatus.PENDING) {
      throw new BadRequestException('Loan is not pending');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.loanApplication.update({
        where: { id },
        data: {
          status: LoanStatus.REJECTED,
          rejectionReason: reason,
          reviewedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'LOAN_REJECTED',
          entityType: 'LoanApplication',
          entityId: application.id,
          oldValue: JSON.stringify({ status: LoanStatus.PENDING }),
          newValue: JSON.stringify({ status: LoanStatus.REJECTED, reason }),
          ipAddress: 'SYSTEM',
          userAgent: 'SYSTEM',
        },
      });

      return updated;
    });
  }

  async disburse(id: string) {
    const application = await this.prisma.loanApplication.findUnique({
      where: { id, status: LoanStatus.APPROVED },
      include: { product: true, member: true },
    });
    if (!application) throw new NotFoundException('Approved loan not found');

    const product = application.product;
    const duration = application.repaymentPeriod;
    const calc = this.calculateInterest(
      application.principal.toNumber(),
      product.interestRate.toNumber(),
      product.interestMethod,
      duration,
    );
    const feeRate = product.processingFee ? product.processingFee.toNumber() : 0;
    const feeAmount = feeRate ? application.principal.toNumber() * (feeRate / 100) : 0;
    const totalPayable = calc.totalAmount + feeAmount;
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
          totalInterest: calc.interestAmount,
          totalAmount: totalPayable,
          amountPaid: 0,
          balance: totalPayable,
          repaymentPeriod: duration,
          repaymentFreq: product.repaymentFreq,
          disbursedAt: new Date(),
          disbursedBy: 'SYSTEM',
          firstDueDate: this.calcFirstDueDate(product.repaymentFreq),
          lastDueDate: this.calcLastDueDate(product.repaymentFreq, duration),
          status: LoanStatus.ACTIVE,
        },
      });

      // Create repayment schedule from engine
      const scheduleData = calc.schedule.map((s) => ({
        loanId: loan.id,
        installment: s.installmentNumber,
        dueDate: s.dueDate,
        principal: s.principal,
        interest: s.interest,
        fees: 0,
        totalAmount: s.totalAmount,
        paidAmount: 0,
        balance: s.remainingBalance,
        status: 'PENDING',
      }));
      await tx.loanSchedule.createMany({ data: scheduleData });

      await tx.loanApplication.update({
        where: { id: application.id },
        data: { status: LoanStatus.ACTIVE },
      });

      // Disbursement journal
      await tx.journalEntry.create({
        data: {
          journalNo: `JE-${Date.now()}-DISB`,
          description: `Loan disbursement: ${loanNo}`,
          entryDate: new Date(),
          totalDebit: totalPayable,
          totalCredit: totalPayable,
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
                credit: totalPayable,
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
                credit: calc.interestAmount,
                description: 'Loan interest receivable',
              },
              ...(feeAmount > 0
                ? [
                    {
                      accountId: await this.resolveAccountCode(tx, 'FEE_INCOME'),
                      debit: 0,
                      credit: feeAmount,
                      description: 'Processing fee',
                    },
                  ]
                : []),
            ],
          },
        },
      });

      await this.queue.publish('notifications.sms', {
        type: 'LOAN_DISBURSED',
        loanNo,
        amount: application.principal,
        memberPhone: application.member?.phonePrimary,
      });

      return loan;
    });
  }

  // ═══════════════════════════════════════════════════════════
  // REPAYMENT
  // ═══════════════════════════════════════════════════════════

  async repay(id: string, memberId: string, dto: RepayLoanDto) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, memberId, status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
    });
    if (!loan) throw new NotFoundException('Active loan not found');
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');

    const outstandingBalance = loan.balance.toNumber();
    if (dto.amount > outstandingBalance) {
      throw new BadRequestException('Amount exceeds outstanding balance');
    }

    const receiptRef = dto.reference || `REPAY-${Date.now()}`;
    const periodId = await this.getOrCreatePeriod();

    return this.prisma.$transaction(async (tx) => {
      const totalInterest = loan.totalInterest.toNumber();
      const totalPrincipal = loan.principal.toNumber();
      const totalInst = totalPrincipal + totalInterest;

      let principalPortion: number;
      let interestPortion: number;

      const method = loan.interestMethod || 'FLAT';
      if (method === 'FLAT') {
        const interestPct = totalInst > 0 ? totalInterest / totalInst : 0;
        interestPortion = Math.round(dto.amount * interestPct);
        principalPortion = dto.amount - interestPortion;
      } else if (method === 'REDUCING_BALANCE' || method === 'REDUCING') {
        const monthlyRate = loan.interestRate.toNumber() / 100 / 12;
        interestPortion = Math.round(outstandingBalance * monthlyRate);
        principalPortion = dto.amount - interestPortion;
      } else {
        const interestPct = totalInst > 0 ? totalInterest / totalInst : 0;
        interestPortion = Math.round(dto.amount * interestPct);
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
          paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
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

      // Update schedule - apply to earliest unpaid installments
      const unpaidSchedules = await tx.loanSchedule.findMany({
        where: { loanId: loan.id, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        orderBy: { installment: 'asc' },
      });

      let remaining = dto.amount;
      for (const schedule of unpaidSchedules) {
        if (remaining <= 0) break;
        const scheduleBalance = schedule.totalAmount.toNumber() - schedule.paidAmount.toNumber();
        const toPay = Math.min(remaining, scheduleBalance);
        remaining -= toPay;
        const newPaid = schedule.paidAmount.toNumber() + toPay;
        const newBalance = schedule.totalAmount.toNumber() - newPaid;
        const newStatus = newBalance <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING';

        await tx.loanSchedule.update({
          where: { id: schedule.id },
          data: {
            paidAmount: newPaid,
            balance: Math.max(0, newBalance),
            status: newStatus,
            ...(newStatus === 'PAID' ? { paidAt: new Date() } : {}),
          },
        });
      }

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

  // ═══════════════════════════════════════════════════════════
  // EARLY REPAYMENT
  // ═══════════════════════════════════════════════════════════

  async earlyRepayment(loanId: string, memberId: string, amount: number) {
    const loan = await this.prisma.loan.findFirst({
      where: { id: loanId, memberId, status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
    });
    if (!loan) throw new NotFoundException('Active loan not found');

    const outstandingBalance = loan.balance.toNumber();
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    if (amount > outstandingBalance) {
      throw new BadRequestException('Amount exceeds outstanding balance');
    }

    const isFullSettlement = Math.abs(amount - outstandingBalance) < 1;
    const fullSettlementAmount = isFullSettlement ? outstandingBalance : amount;

    return this.prisma.$transaction(async (tx) => {
      // Calculate remaining interest savings
      const unpaidSchedules = await tx.loanSchedule.findMany({
        where: { loanId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        orderBy: { installment: 'asc' },
      });

      let remaining = fullSettlementAmount;
      let totalRemainingInterest = 0;
      let waivedInterest = 0;

      for (const schedule of unpaidSchedules) {
        if (remaining <= 0) break;
        const scheduleBalance = schedule.totalAmount.toNumber() - schedule.paidAmount.toNumber();
        const toPay = Math.min(remaining, scheduleBalance);
        remaining -= toPay;
        totalRemainingInterest += schedule.interest.toNumber() - schedule.paidAmount.toNumber() > 0
          ? Math.max(0, schedule.interest.toNumber() - (schedule.paidAmount.toNumber() - schedule.principal.toNumber()))
          : 0;
      }

      // Allocate payment
      let principalPortion: number;
      let interestPortion: number;

      if (isFullSettlement) {
        const totalInst = loan.principal.toNumber() + loan.totalInterest.toNumber();
        const interestPct = totalInst > 0 ? loan.totalInterest.toNumber() / totalInst : 0;
        // For full early settlement, reduce interest proportionally
        const remainingPct = outstandingBalance / loan.totalAmount.toNumber();
        const proportionalInterest = loan.totalInterest.toNumber() * remainingPct;
        interestPortion = Math.round(proportionalInterest);
        principalPortion = outstandingBalance - interestPortion;
        waivedInterest = totalRemainingInterest - interestPortion;
      } else {
        const interestPct = outstandingBalance > 0
          ? (loan.totalInterest.toNumber() / loan.totalAmount.toNumber())
          : 0;
        interestPortion = Math.round(fullSettlementAmount * interestPct);
        principalPortion = fullSettlementAmount - interestPortion;
      }

      const receiptRef = `EARLY-${Date.now()}`;

      const repayment = await tx.loanRepayment.create({
        data: {
          loanId,
          memberId,
          amount: fullSettlementAmount,
          principalPortion: Math.max(0, principalPortion),
          interestPortion: Math.max(0, interestPortion),
          penaltyPortion: 0,
          paymentMethod: PaymentMethod.CASH,
          reference: receiptRef,
          receivedBy: memberId,
          notes: `Early repayment - Full: ${isFullSettlement}`,
        },
      });

      const newBalance = outstandingBalance - fullSettlementAmount;
      const isPaidOff = newBalance <= 0;

      await tx.loan.update({
        where: { id: loanId },
        data: {
          amountPaid: { increment: fullSettlementAmount },
          balance: isPaidOff ? 0 : newBalance,
          status: isPaidOff ? LoanStatus.PAID : loan.status,
          ...(isPaidOff ? { paidAt: new Date() } : {}),
        },
      });

      // Mark all schedules as paid if fully settled
      if (isPaidOff) {
        await tx.loanSchedule.updateMany({
          where: { loanId, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            balance: 0,
          },
        });
      } else {
        // Update schedule
        let rem = fullSettlementAmount;
        for (const schedule of unpaidSchedules) {
          if (rem <= 0) break;
          const scheduleBal = schedule.totalAmount.toNumber() - schedule.paidAmount.toNumber();
          const toPay = Math.min(rem, scheduleBal);
          rem -= toPay;
          const newPaid = schedule.paidAmount.toNumber() + toPay;
          const newBal = schedule.totalAmount.toNumber() - newPaid;
          await tx.loanSchedule.update({
            where: { id: schedule.id },
            data: {
              paidAmount: newPaid,
              balance: Math.max(0, newBal),
              status: newBal <= 0 ? 'PAID' : 'PARTIAL',
              ...(newBal <= 0 ? { paidAt: new Date() } : {}),
            },
          });
        }
      }

      // Journal entry
      await tx.journalEntry.create({
        data: {
          journalNo: `JE-${Date.now()}-EARLY`,
          description: `Early repayment: ${loan.loanNo}${isFullSettlement ? ' (Full)' : ''}`,
          entryDate: new Date(),
          totalDebit: fullSettlementAmount,
          totalCredit: fullSettlementAmount,
          reference: receiptRef,
          referenceId: loan.id,
          refType: 'LOAN_REPAYMENT',
          periodId: await this.getOrCreatePeriod(tx),
          postedBy: 'SYSTEM',
          lines: {
            create: [
              {
                accountId: await this.resolveAccountCode(tx, 'CASH_AND_BANK'),
                debit: fullSettlementAmount,
                credit: 0,
                description: 'Early repayment received',
              },
              {
                accountId: await this.resolveAccountCode(tx, 'LOANS_RECEIVABLE'),
                debit: 0,
                credit: principalPortion,
                description: 'Principal reduction (early)',
              },
              {
                accountId: await this.resolveAccountCode(tx, 'INTEREST_INCOME'),
                debit: 0,
                credit: interestPortion,
                description: 'Interest income (early)',
              },
            ],
          },
        },
      });

      return {
        repayment,
        isFullSettlement,
        waivedInterest: Math.max(0, waivedInterest),
        remainingBalance: Math.max(0, newBalance),
      };
    });
  }

  // ═══════════════════════════════════════════════════════════
  // PENALTIES
  // ═══════════════════════════════════════════════════════════

  async getPenalties(loanId?: string) {
    const where: any = {};
    if (loanId) where.loanId = loanId;

    return this.prisma.loanPenalty.findMany({
      where,
      include: {
        loan: { select: { loanNo: true, memberId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async waivePenalty(id: string, userId: string) {
    const penalty = await this.prisma.loanPenalty.findUnique({ where: { id } });
    if (!penalty) throw new NotFoundException('Penalty not found');
    if (penalty.waivedAt) throw new BadRequestException('Penalty already waived');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.loanPenalty.update({
        where: { id },
        data: {
          waivedAt: new Date(),
          waivedBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'PENALTY_WAIVED',
          entityType: 'LoanPenalty',
          entityId: id,
          oldValue: JSON.stringify({ waivedAt: null }),
          newValue: JSON.stringify({ waivedAt: new Date(), waivedBy: userId }),
          ipAddress: 'SYSTEM',
          userAgent: 'SYSTEM',
        },
      });

      return updated;
    });
  }

  async calculateOverduePenalties() {
    const now = new Date();
    const overdueLoans = await this.prisma.loan.findMany({
      where: { status: LoanStatus.ACTIVE },
      include: { product: true, schedules: { where: { status: { in: ['PENDING', 'OVERDUE'] } } } },
    });

    const results = [];

    for (const loan of overdueLoans) {
      for (const schedule of loan.schedules) {
        if (schedule.dueDate < now && schedule.status !== 'PAID') {
          const daysOverdue = Math.floor((now.getTime() - schedule.dueDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysOverdue <= 0) continue;

          const penaltyRate = loan.product?.latePenaltyRate?.toNumber() || 0;
          const penaltyFixed = loan.product?.latePenaltyFixed?.toNumber() || 0;

          const percentagePenalty = penaltyRate > 0
            ? schedule.totalAmount.toNumber() * (penaltyRate / 100)
            : 0;
          const dailyPenalty = daysOverdue * (penaltyFixed > 0 ? penaltyFixed / 30 : 0);

          const totalPenalty = Math.max(percentagePenalty, dailyPenalty) + (penaltyFixed > 0 ? penaltyFixed : 0);

          if (totalPenalty > 0) {
            const existing = await this.prisma.loanPenalty.findFirst({
              where: { loanId: loan.id, daysOverdue },
            });

            if (!existing) {
              const penalty = await this.prisma.loanPenalty.create({
                data: {
                  loanId: loan.id,
                  amount: totalPenalty,
                  reason: `Late payment - ${daysOverdue} days overdue`,
                  daysOverdue,
                },
              });
              results.push(penalty);
            }
          }

          // Update schedule status to overdue
          await this.prisma.loanSchedule.update({
            where: { id: schedule.id },
            data: { status: 'OVERDUE' },
          });

          // Update loan status
          await this.prisma.loan.update({
            where: { id: loan.id },
            data: { status: LoanStatus.OVERDUE },
          });
        }
      }
    }

    return { penaltiesGenerated: results.length, results };
  }

  async getSchedule(id: string) {
    const schedule = await this.prisma.loanSchedule.findMany({
      where: { loanId: id },
      orderBy: { installment: 'asc' },
    });
    if (!schedule.length) throw new NotFoundException('Loan schedule not found');
    return schedule;
  }

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD STATISTICS
  // ═══════════════════════════════════════════════════════════

  async getStatistics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      totalApps, activeLoans, pendingApps, paidLoans, overdueLoans,
      approvedThisMonth, loansDueToday, totalInterestEarned,
    ] = await Promise.all([
      this.prisma.loanApplication.count({ where: { isDeleted: false } }),
      this.prisma.loan.count({ where: { status: LoanStatus.ACTIVE } }),
      this.prisma.loanApplication.count({ where: { status: LoanStatus.PENDING, isDeleted: false } }),
      this.prisma.loan.count({ where: { status: LoanStatus.PAID } }),
      this.prisma.loan.count({ where: { status: LoanStatus.OVERDUE } }),
      this.prisma.loanApplication.count({
        where: { status: LoanStatus.APPROVED, reviewedAt: { gte: startOfMonth, lte: endOfMonth } },
      }),
      this.prisma.loanSchedule.count({
        where: { dueDate: { gte: new Date(now.setHours(0, 0, 0, 0)), lte: new Date(now.setHours(23, 59, 59, 999)) }, status: { in: ['PENDING', 'PARTIAL'] } },
      }),
      this.prisma.loanRepayment.aggregate({ _sum: { interestPortion: true } }),
    ]);

    const activeLoanData = await this.prisma.loan.findMany({
      where: { status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
      select: { principal: true, balance: true, totalAmount: true, totalInterest: true },
    });

    const totalDisbursed = activeLoanData.reduce((s, l) => s + l.principal.toNumber(), 0);
    const totalOutstanding = activeLoanData.reduce((s, l) => s + l.balance.toNumber(), 0);
    const totalExpected = activeLoanData.reduce((s, l) => s + l.totalAmount.toNumber(), 0);
    const totalInterest = activeLoanData.reduce((s, l) => s + l.totalInterest.toNumber(), 0);

    return {
      totalApplications: totalApps,
      activeLoans,
      pendingApplications: pendingApps,
      paidLoans,
      overdueLoans,
      approvedThisMonth,
      loansDueToday,
      totalDisbursed,
      totalOutstanding,
      totalExpected,
      totalInterest,
      interestEarned: totalInterestEarned._sum.interestPortion?.toNumber() || 0,
      collectionRate: totalExpected > 0
        ? Number(((totalExpected - totalOutstanding) / totalExpected * 100).toFixed(2))
        : 100,
    };
  }

  async getOfficerStatistics() {
    const [pendingApps, approvedApps, rejectedApps] = await Promise.all([
      this.prisma.loanApplication.count({ where: { status: LoanStatus.PENDING, isDeleted: false } }),
      this.prisma.loanApplication.count({ where: { status: LoanStatus.APPROVED, isDeleted: false } }),
      this.prisma.loanApplication.count({ where: { status: LoanStatus.REJECTED, isDeleted: false } }),
    ]);

    const now = new Date();
    const activeLoans = await this.prisma.loan.findMany({
      where: { status: LoanStatus.ACTIVE },
      select: { totalAmount: true, balance: true, repaymentPeriod: true },
    });

    const totalExpectedRevenue = activeLoans.reduce((s, l) => {
      const total = l.totalAmount.toNumber();
      const bal = l.balance.toNumber();
      return s + Math.max(0, total - bal);
    }, 0);

    const repaymentForecast = activeLoans.length > 0
      ? activeLoans.reduce((s, l) => s + (l.totalAmount.toNumber() - l.balance.toNumber()), 0) / Math.max(1, activeLoans.length)
      : 0;

    const riskAssessment = {
      low: activeLoans.filter(l => l.balance.toNumber() < l.totalAmount.toNumber() * 0.3).length,
      medium: activeLoans.filter(l => {
        const ratio = l.balance.toNumber() / l.totalAmount.toNumber();
        return ratio >= 0.3 && ratio < 0.7;
      }).length,
      high: activeLoans.filter(l => l.balance.toNumber() >= l.totalAmount.toNumber() * 0.7).length,
    };

    return {
      pendingApplications: pendingApps,
      approvedApplications: approvedApps,
      rejectedApplications: rejectedApps,
      riskAssessment,
      repaymentForecast: Math.round(repaymentForecast),
      expectedInterestRevenue: Math.round(totalExpectedRevenue),
    };
  }

  async getMemberStatistics(memberId: string) {
    const [activeLoans, totalLoans, applications, repayments, scheduleItems] = await Promise.all([
      this.prisma.loan.findMany({
        where: { memberId, status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
        include: {
          application: { include: { product: true } },
          schedules: { orderBy: { installment: 'asc' } },
          repayments: { orderBy: { paidAt: 'desc' } },
          penalties: { where: { waivedAt: null } },
        },
      }),
      this.prisma.loan.count({ where: { memberId } }),
      this.prisma.loanApplication.count({ where: { memberId, isDeleted: false } }),
      this.prisma.loanRepayment.findMany({
        where: { memberId },
        orderBy: { paidAt: 'desc' },
        take: 10,
      }),
      this.prisma.loanSchedule.findMany({
        where: {
          loan: { memberId, status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        },
        orderBy: { dueDate: 'asc' },
        take: 1,
      }),
    ]);

    const totalOutstanding = activeLoans.reduce((s, l) => s + l.balance.toNumber(), 0);
    const nextPayment = scheduleItems.length > 0 ? scheduleItems[0] : null;

    return {
      totalLoans,
      totalApplications: applications,
      activeLoansCount: activeLoans.length,
      totalOutstanding,
      activeLoans: activeLoans.map(l => ({
        id: l.id,
        loanNo: l.loanNo,
        product: l.application?.product?.name || 'N/A',
        principal: l.principal.toNumber(),
        interestRate: l.interestRate.toNumber(),
        totalInterest: l.totalInterest.toNumber(),
        totalAmount: l.totalAmount.toNumber(),
        amountPaid: l.amountPaid.toNumber(),
        balance: l.balance.toNumber(),
        status: l.status,
        nextDueDate: nextPayment?.dueDate || null,
        nextDueAmount: nextPayment?.totalAmount?.toNumber() || 0,
        progress: l.totalAmount.toNumber() > 0
          ? Math.round((l.amountPaid.toNumber() / l.totalAmount.toNumber()) * 100)
          : 0,
      })),
      recentRepayments: repayments,
    };
  }

  async getOverview() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [activeLoans, loansDueToday, overdueLoans, approvedThisMonth, totalInterestEarned] = await Promise.all([
      this.prisma.loan.findMany({
        where: { status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
        select: { balance: true, totalAmount: true, totalInterest: true },
      }),
      this.prisma.loanSchedule.count({
        where: { dueDate: { gte: todayStart, lte: todayEnd }, status: { in: ['PENDING', 'PARTIAL'] } },
      }),
      this.prisma.loan.count({ where: { status: LoanStatus.OVERDUE } }),
      this.prisma.loanApplication.count({
        where: { status: LoanStatus.APPROVED, reviewedAt: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.loanRepayment.aggregate({
        _sum: { interestPortion: true },
        where: { paidAt: { gte: monthStart, lte: monthEnd } },
      }),
    ]);

    const totalOutstanding = activeLoans.reduce((s, l) => s + l.balance.toNumber(), 0);
    const totalActiveAmount = activeLoans.reduce((s, l) => s + l.totalAmount.toNumber(), 0);

    return {
      totalActiveLoans: activeLoans.length,
      totalOutstandingAmount: totalOutstanding,
      loansDueToday,
      loansOverdue: overdueLoans,
      loansApprovedThisMonth: approvedThisMonth,
      loanInterestEarned: totalInterestEarned._sum.interestPortion?.toNumber() || 0,
      totalPortfolioSize: totalActiveAmount,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════════════════════════

  async getPortfolioReport(format: string) {
    const loans = await this.prisma.loan.findMany({
      include: {
        member: { select: { fullName: true, memberNumber: true } },
        application: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const report = {
      generatedAt: new Date(),
      totalLoans: loans.length,
      totalPrincipal: loans.reduce((s, l) => s + l.principal.toNumber(), 0),
      totalInterest: loans.reduce((s, l) => s + l.totalInterest.toNumber(), 0),
      totalOutstanding: loans.reduce((s, l) => s + l.balance.toNumber(), 0),
      byStatus: {
        active: loans.filter(l => l.status === LoanStatus.ACTIVE).length,
        overdue: loans.filter(l => l.status === LoanStatus.OVERDUE).length,
        paid: loans.filter(l => l.status === LoanStatus.PAID).length,
        writtenOff: loans.filter(l => l.status === LoanStatus.WRITTEN_OFF).length,
      },
      loans: loans.map(l => ({
        loanNo: l.loanNo,
        member: l.member.fullName,
        product: l.application?.product?.name || 'N/A',
        principal: l.principal.toNumber(),
        interest: l.totalInterest.toNumber(),
        total: l.totalAmount.toNumber(),
        paid: l.amountPaid.toNumber(),
        balance: l.balance.toNumber(),
        status: l.status,
        disbursedAt: l.disbursedAt,
      })),
    };

    if (format === 'csv') {
      const header = 'LoanNo,Member,Product,Principal,Interest,Total,Paid,Balance,Status\n';
      const rows = report.loans.map(l =>
        `${l.loanNo},${l.member},${l.product},${l.principal},${l.interest},${l.total},${l.paid},${l.balance},${l.status}`
      ).join('\n');
      return header + rows;
    }

    return report;
  }

  async getInterestRevenueReport(format: string) {
    const repayments = await this.prisma.loanRepayment.findMany({
      include: {
        loan: { include: { member: { select: { fullName: true } } } },
      },
      orderBy: { paidAt: 'desc' },
    });

    const totalInterestCollected = repayments.reduce((s, r) => s + r.interestPortion.toNumber(), 0);
    const totalPenaltyCollected = repayments.reduce((s, r) => s + r.penaltyPortion.toNumber(), 0);

    const report = {
      generatedAt: new Date(),
      totalInterestCollected,
      totalPenaltyCollected,
      totalRevenue: totalInterestCollected + totalPenaltyCollected,
      transactions: repayments.map(r => ({
        loanNo: r.loan.loanNo,
        member: r.loan.member.fullName,
        amount: r.amount.toNumber(),
        interestPortion: r.interestPortion.toNumber(),
        penaltyPortion: r.penaltyPortion.toNumber(),
        date: r.paidAt,
      })),
    };

    if (format === 'csv') {
      const header = 'LoanNo,Member,Amount,InterestPortion,PenaltyPortion,Date\n';
      const rows = report.transactions.map(t =>
        `${t.loanNo},${t.member},${t.amount},${t.interestPortion},${t.penaltyPortion},${t.date}`
      ).join('\n');
      return header + rows;
    }

    return report;
  }

  async getOutstandingReport(format: string) {
    const loans = await this.prisma.loan.findMany({
      where: { status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
      include: {
        member: { select: { fullName: true, memberNumber: true } },
        application: { include: { product: true } },
        schedules: { where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
      },
      orderBy: { balance: 'desc' },
    });

    const report = {
      generatedAt: new Date(),
      totalOutstanding: loans.reduce((s, l) => s + l.balance.toNumber(), 0),
      totalLoans: loans.length,
      loans: loans.map(l => ({
        loanNo: l.loanNo,
        member: l.member.fullName,
        product: l.application?.product?.name || 'N/A',
        principal: l.principal.toNumber(),
        balance: l.balance.toNumber(),
        paid: l.amountPaid.toNumber(),
        progress: l.totalAmount.toNumber() > 0
          ? Math.round((l.amountPaid.toNumber() / l.totalAmount.toNumber()) * 100)
          : 0,
        nextDueDate: l.schedules[0]?.dueDate || null,
        status: l.status,
      })),
    };

    if (format === 'csv') {
      const header = 'LoanNo,Member,Product,Principal,Balance,Paid,Progress%,Status\n';
      const rows = report.loans.map(l =>
        `${l.loanNo},${l.member},${l.product},${l.principal},${l.balance},${l.paid},${l.progress},${l.status}`
      ).join('\n');
      return header + rows;
    }

    return report;
  }

  async getOverdueReport(format: string) {
    const loans = await this.prisma.loan.findMany({
      where: { status: LoanStatus.OVERDUE },
      include: {
        member: { select: { fullName: true, memberNumber: true, phonePrimary: true } },
        application: { include: { product: true } },
        penalties: { where: { waivedAt: null } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();
    const report = {
      generatedAt: new Date(),
      totalOverdue: loans.length,
      totalOverdueAmount: loans.reduce((s, l) => s + l.balance.toNumber(), 0),
      totalPenalties: loans.reduce((s, l) => s + l.penalties.reduce((sp, p) => sp + p.amount.toNumber(), 0), 0),
      loans: loans.map(l => {
        const daysOverdue = l.schedules?.length
          ? Math.max(0, ...l.schedules.filter(s => s.dueDate < now).map(s =>
              Math.floor((now.getTime() - s.dueDate.getTime()) / (1000 * 60 * 60 * 24))
            ))
          : 0;
        return {
          loanNo: l.loanNo,
          member: l.member.fullName,
          phone: l.member.phonePrimary,
          product: l.application?.product?.name || 'N/A',
          principal: l.principal.toNumber(),
          balance: l.balance.toNumber(),
          daysOverdue,
          penalties: l.penalties.reduce((s, p) => s + p.amount.toNumber(), 0),
          status: l.status,
        };
      }),
    };

    if (format === 'csv') {
      const header = 'LoanNo,Member,Phone,Product,Principal,Balance,DaysOverdue,Penalties\n';
      const rows = report.loans.map(l =>
        `${l.loanNo},${l.member},${l.phone},${l.product},${l.principal},${l.balance},${l.daysOverdue},${l.penalties}`
      ).join('\n');
      return header + rows;
    }

    return report;
  }

  async getProductPerformanceReport(format: string) {
    const products = await this.prisma.loanProduct.findMany({
      include: {
        applications: {
          where: { isDeleted: false },
          include: { loan: true },
        },
      },
    });

    const report = {
      generatedAt: new Date(),
      products: products.map(p => {
        const loans = p.applications.filter(a => a.loan).map(a => a.loan!);
        return {
          name: p.name,
          code: p.code,
          interestRate: p.interestRate.toNumber(),
          interestMethod: p.interestMethod,
          totalApplications: p.applications.length,
          totalApproved: p.applications.filter(a => a.status === LoanStatus.APPROVED || a.status === LoanStatus.ACTIVE || a.status === LoanStatus.PAID).length,
          totalRejected: p.applications.filter(a => a.status === LoanStatus.REJECTED).length,
          totalDisbursed: loans.reduce((s, l) => s + l.principal.toNumber(), 0),
          totalOutstanding: loans.reduce((s, l) => s + l.balance.toNumber(), 0),
          totalInterest: loans.reduce((s, l) => s + l.totalInterest.toNumber(), 0),
          repaymentRate: loans.length > 0
            ? Math.round((loans.filter(l => l.status === LoanStatus.PAID).length / loans.length) * 100)
            : 0,
        };
      }),
    };

    if (format === 'csv') {
      const header = 'Product,Code,Rate,Method,Applications,Approved,Rejected,Disbursed,Outstanding,Interest,RepaymentRate%\n';
      const rows = report.products.map(p =>
        `${p.name},${p.code},${p.interestRate},${p.interestMethod},${p.totalApplications},${p.totalApproved},${p.totalRejected},${p.totalDisbursed},${p.totalOutstanding},${p.totalInterest},${p.repaymentRate}`
      ).join('\n');
      return header + rows;
    }

    return report;
  }

  async getRecoveryReport(format: string) {
    const paidLoans = await this.prisma.loan.findMany({
      where: { status: LoanStatus.PAID },
      include: {
        member: { select: { fullName: true } },
        application: { include: { product: true } },
        repayments: true,
      },
      orderBy: { paidAt: 'desc' },
    });

    const overdueLoans = await this.prisma.loan.findMany({
      where: { status: LoanStatus.OVERDUE },
      include: {
        member: { select: { fullName: true } },
        application: { include: { product: true } },
      },
    });

    const totalRecovered = paidLoans.reduce((s, l) => s + l.amountPaid.toNumber(), 0);
    const totalDisbursed = [...paidLoans, ...overdueLoans].reduce((s, l) => s + l.principal.toNumber(), 0);

    const report = {
      generatedAt: new Date(),
      totalRecovered,
      totalOutstanding: overdueLoans.reduce((s, l) => s + l.balance.toNumber(), 0),
      recoveryRate: totalDisbursed > 0 ? Math.round((totalRecovered / totalDisbursed) * 100) : 0,
      paidLoans: paidLoans.length,
      overdueLoans: overdueLoans.length,
      recoveredLoans: paidLoans.map(l => ({
        loanNo: l.loanNo,
        member: l.member.fullName,
        product: l.application?.product?.name || 'N/A',
        principal: l.principal.toNumber(),
        recovered: l.amountPaid.toNumber(),
        interest: l.totalInterest.toNumber(),
        paidAt: l.paidAt,
      })),
    };

    if (format === 'csv') {
      const header = 'LoanNo,Member,Product,Principal,Recovered,Interest,PaidAt\n';
      const rows = report.recoveredLoans.map(l =>
        `${l.loanNo},${l.member},${l.product},${l.principal},${l.recovered},${l.interest},${l.paidAt}`
      ).join('\n');
      return header + rows;
    }

    return report;
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  private calcFirstDueDate(freq: string): Date {
    const d = new Date();
    if (freq === 'MONTHLY') d.setMonth(d.getMonth() + 1);
    else if (freq === 'WEEKLY') d.setDate(d.getDate() + 7);
    else if (freq === 'QUARTERLY') d.setMonth(d.getMonth() + 3);
    return d;
  }

  private calcLastDueDate(freq: string, period: number): Date {
    const d = new Date();
    if (freq === 'MONTHLY') d.setMonth(d.getMonth() + period);
    else if (freq === 'WEEKLY') d.setDate(d.getDate() + 7 * period);
    else if (freq === 'QUARTERLY') d.setMonth(d.getMonth() + 3 * period);
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
