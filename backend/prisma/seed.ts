// ─────────────────────────────────────────────────────────
// Jenga Wealth – Database Seed Script
// Creates demo users, members, accounts, and transactions
// ─────────────────────────────────────────────────────────

import { PrismaClient, Role, UserStatus, MemberStatus, KycStatus, SavingsAccountStatus, SavingsProductType, LoanStatus, LoanProductType, AccountCategory, AccountSubCategory, SavingsTransactionType, PaymentMethod, CashAccountType } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const uid = () => crypto.randomUUID();

function memberNo(i: number): string { return `JNW-${String(i).padStart(5, '0')}`; }
function acctNo(i: number): string { return `SAV-${String(i).padStart(5, '0')}`; }
function appNo(i: number): string { return `LAP-${String(i).padStart(5, '0')}`; }
function loanNo(i: number): string { return `LN-${String(i).padStart(5, '0')}`; }
function journalNo(i: number): string { return `JN-${String(i).padStart(5, '0')}`; }
function receiptNo(i: number): string { return `RCP-${String(i).padStart(6, '0')}`; }

async function main() {
  console.log('🌱  Seeding Jenga Wealth database...\n');

  // ── Clean existing data ──────────────────────────────
  await prisma.$transaction([
    prisma.vote.deleteMany(),
    prisma.resolution.deleteMany(),
    prisma.meeting.deleteMany(),
    prisma.systemEvent.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.generalLedger.deleteMany(),
    prisma.journalLine.deleteMany(),
    prisma.journalEntry.deleteMany(),
    prisma.financialPeriod.deleteMany(),
    prisma.chartOfAccount.deleteMany(),
    prisma.cashReconciliation.deleteMany(),
    prisma.cashAccount.deleteMany(),
    prisma.dividendDistribution.deleteMany(),
    prisma.shareValue.deleteMany(),
    prisma.sharePurchase.deleteMany(),
    prisma.share.deleteMany(),
    prisma.loanPenalty.deleteMany(),
    prisma.loanRepayment.deleteMany(),
    prisma.loanSchedule.deleteMany(),
    prisma.loan.deleteMany(),
    prisma.loanCollateral.deleteMany(),
    prisma.loanGuarantor.deleteMany(),
    prisma.loanApplication.deleteMany(),
    prisma.loanProduct.deleteMany(),
    prisma.savingsInterest.deleteMany(),
    prisma.savingsTransaction.deleteMany(),
    prisma.savingsGoal.deleteMany(),
    prisma.savingsAccount.deleteMany(),
    prisma.savingsProduct.deleteMany(),
    prisma.memberDocument.deleteMany(),
    prisma.beneficiary.deleteMany(),
    prisma.member.deleteMany(),
    prisma.passwordHistory.deleteMany(),
    prisma.loginAttempt.deleteMany(),
    prisma.userDevice.deleteMany(),
    prisma.userSession.deleteMany(),
    prisma.user.deleteMany(),
    prisma.systemConfig.deleteMany(),
  ]);

  console.log('  ✓ Cleaned all existing data\n');

  // ── 1. Create Users ──────────────────────────────────
  const passwordHash = await argon2.hash('Admin@123');
  const memberPassHash = await argon2.hash('Member@123');

  const users = {
    admin: await prisma.user.create({ data: { id: uid(), username: 'admin', email: 'admin@jengawealth.com', passwordHash, role: Role.ADMINISTRATOR, status: UserStatus.ACTIVE } }),
    treasurer: await prisma.user.create({ data: { id: uid(), username: 'treasurer', email: 'treasurer@jengawealth.com', passwordHash, role: Role.TREASURER, status: UserStatus.ACTIVE } }),
    loanOfficer: await prisma.user.create({ data: { id: uid(), username: 'loanofficer', email: 'loanofficer@jengawealth.com', passwordHash, role: Role.LOAN_OFFICER, status: UserStatus.ACTIVE } }),
    auditor: await prisma.user.create({ data: { id: uid(), username: 'auditor', email: 'auditor@jengawealth.com', passwordHash, role: Role.AUDITOR, status: UserStatus.ACTIVE } }),
    boardMember: await prisma.user.create({ data: { id: uid(), username: 'boardmember', email: 'board@jengawealth.com', passwordHash, role: Role.BOARD_MEMBER, status: UserStatus.ACTIVE } }),
    john: await prisma.user.create({ data: { id: uid(), username: 'john', email: 'john@email.com', phone: '+256701000001', passwordHash: memberPassHash, role: Role.MEMBER, status: UserStatus.ACTIVE } }),
    jane: await prisma.user.create({ data: { id: uid(), username: 'jane', email: 'jane@email.com', phone: '+256701000002', passwordHash: memberPassHash, role: Role.MEMBER, status: UserStatus.ACTIVE } }),
    peter: await prisma.user.create({ data: { id: uid(), username: 'peter', email: 'peter@email.com', phone: '+256701000003', passwordHash: memberPassHash, role: Role.MEMBER, status: UserStatus.ACTIVE } }),
  };
  console.log('  ✓ Created 8 users');

  // ── 2. Create Members ────────────────────────────────
  const members = {
    john: await prisma.member.create({
      data: { id: uid(), userId: users.john.id, memberNumber: memberNo(1), fullName: 'John Mukasa', dateOfBirth: new Date('1985-06-15'), gender: 'MALE', nationality: 'Ugandan', email: 'john@email.com', phonePrimary: '+256701000001', addressLine1: 'Plot 15, Kampala Road', city: 'Kampala', district: 'Kampala', occupation: 'Teacher', employer: 'Kitante Secondary School', kycStatus: KycStatus.VERIFIED, kycVerifiedAt: new Date('2024-01-10'), idType: 'NATIONAL_ID', idNumber: 'CM12345678', status: MemberStatus.ACTIVE },
    }),
    jane: await prisma.member.create({
      data: { id: uid(), userId: users.jane.id, memberNumber: memberNo(2), fullName: 'Jane Nakato', dateOfBirth: new Date('1990-03-22'), gender: 'FEMALE', nationality: 'Ugandan', email: 'jane@email.com', phonePrimary: '+256701000002', addressLine1: 'Plot 7, Jinja Road', city: 'Jinja', district: 'Jinja', occupation: 'Nurse', employer: 'Jinja Regional Hospital', kycStatus: KycStatus.VERIFIED, kycVerifiedAt: new Date('2024-02-15'), idType: 'NATIONAL_ID', idNumber: 'CM23456789', status: MemberStatus.ACTIVE },
    }),
    peter: await prisma.member.create({
      data: { id: uid(), userId: users.peter.id, memberNumber: memberNo(3), fullName: 'Peter Okello', dateOfBirth: new Date('1978-11-08'), gender: 'MALE', nationality: 'Ugandan', email: 'peter@email.com', phonePrimary: '+256701000003', addressLine1: 'Plot 22, Main Street', city: 'Gulu', district: 'Gulu', occupation: 'Farmer', employer: 'Self Employed', kycStatus: KycStatus.PENDING, idType: 'NATIONAL_ID', idNumber: 'CM34567890', status: MemberStatus.ACTIVE },
    }),
  };
  console.log('  ✓ Created 3 members');

  // ── Create share records for members ─────────────────
  const shares = {
    john: await prisma.share.create({ data: { id: uid(), memberId: members.john.id, totalUnits: 500, totalValue: 500000 } }),
    jane: await prisma.share.create({ data: { id: uid(), memberId: members.jane.id, totalUnits: 300, totalValue: 300000 } }),
    peter: await prisma.share.create({ data: { id: uid(), memberId: members.peter.id, totalUnits: 100, totalValue: 100000 } }),
  };
  console.log('  ✓ Created 3 share accounts');

  // ── 3. Create Chart of Accounts ──────────────────────
  const accounts = {
    cashPetty: await prisma.chartOfAccount.create({ data: { id: uid(), code: '1010', name: 'Cash - Petty Cash', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET, normalSide: 'DEBIT' } }),
    cashBank: await prisma.chartOfAccount.create({ data: { id: uid(), code: '1020', name: 'Cash - Bank Account', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET, normalSide: 'DEBIT' } }),
    cashMobile: await prisma.chartOfAccount.create({ data: { id: uid(), code: '1030', name: 'Cash - Mobile Money', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET, normalSide: 'DEBIT' } }),
    loanReceivables: await prisma.chartOfAccount.create({ data: { id: uid(), code: '1100', name: 'Loan Receivables', category: AccountCategory.ASSET, subCategory: AccountSubCategory.CURRENT_ASSET, normalSide: 'DEBIT' } }),
    memberSavings: await prisma.chartOfAccount.create({ data: { id: uid(), code: '2010', name: 'Member Savings Deposits', category: AccountCategory.LIABILITY, subCategory: AccountSubCategory.CURRENT_LIABILITY, normalSide: 'CREDIT' } }),
    shareCapital: await prisma.chartOfAccount.create({ data: { id: uid(), code: '2020', name: 'Member Share Capital', category: AccountCategory.LIABILITY, subCategory: AccountSubCategory.CURRENT_LIABILITY, normalSide: 'CREDIT' } }),
    retainedEarnings: await prisma.chartOfAccount.create({ data: { id: uid(), code: '3010', name: 'Retained Earnings', category: AccountCategory.EQUITY, subCategory: AccountSubCategory.RETAINED_EARNINGS, normalSide: 'CREDIT' } }),
    interestIncome: await prisma.chartOfAccount.create({ data: { id: uid(), code: '4010', name: 'Interest Income - Loans', category: AccountCategory.INCOME, subCategory: AccountSubCategory.INTEREST_INCOME, normalSide: 'CREDIT' } }),
    feeIncome: await prisma.chartOfAccount.create({ data: { id: uid(), code: '4020', name: 'Fee Income', category: AccountCategory.INCOME, subCategory: AccountSubCategory.FEE_INCOME, normalSide: 'CREDIT' } }),
    interestExpense: await prisma.chartOfAccount.create({ data: { id: uid(), code: '5010', name: 'Interest Expense - Savings', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.OPERATING_EXPENSE, normalSide: 'DEBIT' } }),
    operatingExpense: await prisma.chartOfAccount.create({ data: { id: uid(), code: '5020', name: 'Operating Expenses', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.ADMIN_EXPENSE, normalSide: 'DEBIT' } }),
    provisionBadDebts: await prisma.chartOfAccount.create({ data: { id: uid(), code: '5030', name: 'Provision for Bad Debts', category: AccountCategory.EXPENSE, subCategory: AccountSubCategory.PROVISION_EXPENSE, normalSide: 'DEBIT' } }),
  };
  console.log('  ✓ Created 12 chart of accounts');

  // ── 4. Create Financial Periods ──────────────────────
  const now = new Date();
  const periods = {
    current: await prisma.financialPeriod.create({
      data: { id: uid(), name: `FY ${now.getFullYear()}`, startDate: new Date(now.getFullYear(), 0, 1), endDate: new Date(now.getFullYear(), 11, 31), isClosed: false },
    }),
    previous: await prisma.financialPeriod.create({
      data: { id: uid(), name: `FY ${now.getFullYear() - 1}`, startDate: new Date(now.getFullYear() - 1, 0, 1), endDate: new Date(now.getFullYear() - 1, 11, 31), isClosed: true, closedAt: new Date(now.getFullYear(), 0, 1), closedBy: users.admin.id },
    }),
  };
  console.log('  ✓ Created 2 financial periods');

  // ── 5. Create Savings Products ───────────────────────
  const savingsProducts = {
    regular: await prisma.savingsProduct.create({ data: { id: uid(), name: 'Regular Savings', code: 'REG', productType: SavingsProductType.REGULAR, minBalance: 5000, maxBalance: null, interestRate: 3.0, interestFreq: 'MONTHLY', charges: [{ name: 'Account Opening', amount: 10000 }] } }),
    fixed: await prisma.savingsProduct.create({ data: { id: uid(), name: 'Fixed Deposit', code: 'FD', productType: SavingsProductType.FIXED_DEPOSIT, minBalance: 100000, maxBalance: 50000000, interestRate: 8.0, interestFreq: 'MATURITY' } }),
    goal: await prisma.savingsProduct.create({ data: { id: uid(), name: 'Education Goal', code: 'EDU', productType: SavingsProductType.GOAL_BASED, minBalance: 20000, interestRate: 5.0, interestFreq: 'MONTHLY' } }),
  };
  console.log('  ✓ Created 3 savings products');

  // ── 6. Create Loan Products ──────────────────────────
  const loanProducts = {
    regular: await prisma.loanProduct.create({ data: { id: uid(), name: 'Regular Loan', code: 'REG', productType: LoanProductType.REGULAR, minAmount: 50000, maxAmount: 5000000, interestRate: 15.0, interestMethod: 'DECLINING', repaymentPeriod: 12, repaymentFreq: 'MONTHLY', requiresGuarantor: true, maxGuarantors: 2 } }),
    emergency: await prisma.loanProduct.create({ data: { id: uid(), name: 'Emergency Loan', code: 'EMR', productType: LoanProductType.EMERGENCY, minAmount: 10000, maxAmount: 500000, interestRate: 10.0, interestMethod: 'FLAT', repaymentPeriod: 6, repaymentFreq: 'MONTHLY', processingFee: 1.0 } }),
    agriculture: await prisma.loanProduct.create({ data: { id: uid(), name: 'Agriculture Loan', code: 'AGR', productType: LoanProductType.AGRICULTURE, minAmount: 100000, maxAmount: 10000000, interestRate: 12.0, interestMethod: 'DECLINING', repaymentPeriod: 24, repaymentFreq: 'MONTHLY', requiresCollateral: true } }),
    education: await prisma.loanProduct.create({ data: { id: uid(), name: 'Education Loan', code: 'EDU', productType: LoanProductType.EDUCATION, minAmount: 100000, maxAmount: 20000000, interestRate: 8.0, interestMethod: 'DECLINING', repaymentPeriod: 36, repaymentFreq: 'MONTHLY' } }),
    business: await prisma.loanProduct.create({ data: { id: uid(), name: 'Business Loan', code: 'BIZ', productType: LoanProductType.BUSINESS, minAmount: 200000, maxAmount: 50000000, interestRate: 18.0, interestMethod: 'DECLINING', repaymentPeriod: 24, repaymentFreq: 'MONTHLY', requiresGuarantor: true, requiresCollateral: true, maxGuarantors: 2 } }),
  };
  console.log('  ✓ Created 5 loan products');

  // ── 7. Create Savings Accounts & Transactions ────────
  let jn = 1;
  let rn = 1;

  async function createJournalEntry(data: { description: string; lines: { accountId: string; debit?: number; credit?: number }[]; userId: string; date?: Date }) {
    const entryDate = data.date || new Date();
    let totalDebit = 0, totalCredit = 0;
    const lines = data.lines.map(l => {
      if (l.debit) totalDebit += l.debit;
      if (l.credit) totalCredit += l.credit;
      return { id: uid(), accountId: l.accountId, debit: l.debit || 0, credit: l.credit || 0, description: data.description };
    });
    const journal = await prisma.journalEntry.create({
      data: {
        id: uid(), journalNo: journalNo(jn++), description: data.description,
        periodId: periods.current.id, entryDate, totalDebit, totalCredit,
        postedBy: data.userId, referenceId: null, refType: null,
        lines: { create: lines },
      },
    });
    for (const line of data.lines) {
      const existing = await prisma.generalLedger.findUnique({
        where: { accountId_periodId: { accountId: line.accountId, periodId: periods.current.id } },
      });
      if (existing) {
        await prisma.generalLedger.update({
          where: { id: existing.id },
          data: { debits: existing.debits.toNumber() + (line.debit || 0), credits: existing.credits.toNumber() + (line.credit || 0), closing: existing.closing.toNumber() + (line.debit || 0) - (line.credit || 0) },
        });
      } else {
        await prisma.generalLedger.create({
          data: { id: uid(), accountId: line.accountId, periodId: periods.current.id, opening: 0, debits: line.debit || 0, credits: line.credit || 0, closing: (line.debit || 0) - (line.credit || 0) },
        });
      }
    }
    return journal;
  }

  async function createMemberSavingsAccount(member: typeof members.john, product: typeof savingsProducts.regular, accountNum: number, initialDeposit: number, userId: string) {
    const acct = await prisma.savingsAccount.create({
      data: { id: uid(), memberId: member.id, productId: product.id, accountNumber: acctNo(accountNum), status: SavingsAccountStatus.ACTIVE, balance: initialDeposit, availableBalance: initialDeposit },
    });
    if (initialDeposit > 0) {
      const journal = await createJournalEntry({
        description: `Initial deposit - ${member.fullName}`,
        lines: [
          { accountId: accounts.cashBank.id, credit: initialDeposit },
          { accountId: accounts.memberSavings.id, debit: initialDeposit },
        ],
        userId,
        date: new Date(Date.now() - 86400000 * 30 * Math.random()),
      });
      await prisma.savingsTransaction.create({
        data: { id: uid(), accountId: acct.id, type: SavingsTransactionType.DEPOSIT, amount: initialDeposit, balanceBefore: 0, balanceAfter: initialDeposit, description: 'Initial deposit', paymentMethod: PaymentMethod.BANK_TRANSFER, receiptNumber: receiptNo(rn++), journalId: journal.id },
      });
    }
    return acct;
  }

  const savingsAccounts = {
    john: await createMemberSavingsAccount(members.john, savingsProducts.regular, 1, 500000, users.treasurer.id),
    jane: await createMemberSavingsAccount(members.jane, savingsProducts.regular, 2, 350000, users.treasurer.id),
    peter: await createMemberSavingsAccount(members.peter, savingsProducts.regular, 3, 100000, users.treasurer.id),
  };
  console.log('  ✓ Created 3 savings accounts with initial deposits');

  // Additional deposits for John
  for (let i = 1; i <= 5; i++) {
    const amount = 20000 + Math.floor(Math.random() * 50000);
    const balBefore = savingsAccounts.john.balance.toNumber();
    const balAfter = balBefore + amount;
    const journal = await createJournalEntry({
      description: `Deposit - ${members.john.fullName}`,
      lines: [
        { accountId: accounts.cashBank.id, credit: amount },
        { accountId: accounts.memberSavings.id, debit: amount },
      ],
      userId: users.treasurer.id,
      date: new Date(Date.now() - 86400000 * (30 - i * 5)),
    });
    await prisma.savingsTransaction.create({
      data: { id: uid(), accountId: savingsAccounts.john.id, type: SavingsTransactionType.DEPOSIT, amount, balanceBefore: balBefore, balanceAfter: balAfter, description: `Monthly deposit ${i}`, paymentMethod: PaymentMethod.CASH, receiptNumber: receiptNo(rn++), journalId: journal.id },
    });
    await prisma.savingsAccount.update({ where: { id: savingsAccounts.john.id }, data: { balance: balAfter, availableBalance: balAfter } });
  }

  // Additional deposits for Jane
  for (let i = 1; i <= 3; i++) {
    const amount = 30000 + Math.floor(Math.random() * 40000);
    const balBefore = savingsAccounts.jane.balance.toNumber();
    const balAfter = balBefore + amount;
    const journal = await createJournalEntry({
      description: `Deposit - ${members.jane.fullName}`,
      lines: [
        { accountId: accounts.cashBank.id, credit: amount },
        { accountId: accounts.memberSavings.id, debit: amount },
      ],
      userId: users.treasurer.id,
      date: new Date(Date.now() - 86400000 * (20 - i * 6)),
    });
    await prisma.savingsTransaction.create({
      data: { id: uid(), accountId: savingsAccounts.jane.id, type: SavingsTransactionType.DEPOSIT, amount, balanceBefore: balBefore, balanceAfter: balAfter, description: `Savings deposit ${i}`, paymentMethod: PaymentMethod.MOBILE_MONEY, receiptNumber: receiptNo(rn++), journalId: journal.id },
    });
    await prisma.savingsAccount.update({ where: { id: savingsAccounts.jane.id }, data: { balance: balAfter, availableBalance: balAfter } });
  }
  console.log('  ✓ Created additional savings deposits');

  // ── 8. Create Loan Applications & Loans ──────────────
  // John: active loan of 1,000,000
  const johnApp = await prisma.loanApplication.create({
    data: { id: uid(), memberId: members.john.id, productId: loanProducts.regular.id, applicationNo: appNo(1), principal: 1000000, purpose: 'Home improvement', repaymentPeriod: 12, status: LoanStatus.ACTIVE, riskScore: 72, submittedAt: new Date(Date.now() - 86400000 * 60) },
  });
  const johnLoan = await prisma.loan.create({
    data: { id: uid(), applicationId: johnApp.id, memberId: members.john.id, loanNo: loanNo(1), principal: 1000000, interestRate: 15.0, interestMethod: 'DECLINING', totalInterest: 83000, totalAmount: 1083000, amountPaid: 270000, balance: 813000, repaymentPeriod: 12, status: LoanStatus.ACTIVE, disbursedAt: new Date(Date.now() - 86400000 * 55), disbursedBy: users.loanOfficer.id, firstDueDate: new Date(Date.now() - 86400000 * 25) },
  });
  // Disbursement journal
  const disbJournal = await createJournalEntry({
    description: `Loan disbursement - ${members.john.fullName}`,
    lines: [
      { accountId: accounts.loanReceivables.id, debit: 1000000 },
      { accountId: accounts.cashBank.id, credit: 1000000 },
    ],
    userId: users.loanOfficer.id,
    date: new Date(Date.now() - 86400000 * 55),
  });
  await prisma.journalEntry.update({ where: { id: disbJournal.id }, data: { referenceId: johnLoan.id, refType: 'loan_disbursement' } });

  // John's loan schedule (12 monthly installments)
  for (let m = 0; m < 12; m++) {
    const principal = 83333;
    const interest = m < 6 ? 6917 : 6000;
    const total = principal + interest;
    const paid = m < 3 ? total : 0;
    await prisma.loanSchedule.create({
      data: { id: uid(), loanId: johnLoan.id, installment: m + 1, dueDate: new Date(Date.now() - 86400000 * (55 - m * 30)), principal, interest, totalAmount: total, paidAmount: paid, balance: total - paid, status: paid > 0 ? 'PAID' : 'PENDING' },
    });
  }

  // John's repayments (3 payments made)
  for (let m = 0; m < 3; m++) {
    const journal = await createJournalEntry({
      description: `Loan repayment - ${members.john.fullName} (installment ${m + 1})`,
      lines: [
        { accountId: accounts.cashBank.id, debit: 90250 },
        { accountId: accounts.loanReceivables.id, credit: 83333 },
        { accountId: accounts.interestIncome.id, credit: 6917 },
      ],
      userId: users.treasurer.id,
      date: new Date(Date.now() - 86400000 * (50 - m * 30)),
    });
    await prisma.loanRepayment.create({
      data: { id: uid(), loanId: johnLoan.id, memberId: members.john.id, amount: 90250, principalPortion: 83333, interestPortion: 6917, paymentMethod: 'CASH', receiptNumber: receiptNo(rn++), journalId: journal.id, receivedBy: users.treasurer.id, paidAt: new Date(Date.now() - 86400000 * (50 - m * 30)) },
    });
  }
  await prisma.journalEntry.update({ where: { id: disbJournal.id }, data: { refType: 'loan_disbursement' } });

  // Jane: active loan of 500,000 (emergency)
  const janeApp = await prisma.loanApplication.create({
    data: { id: uid(), memberId: members.jane.id, productId: loanProducts.emergency.id, applicationNo: appNo(2), principal: 500000, purpose: 'Medical emergency', repaymentPeriod: 6, status: LoanStatus.ACTIVE, riskScore: 85, submittedAt: new Date(Date.now() - 86400000 * 40) },
  });
  const janeLoan = await prisma.loan.create({
    data: { id: uid(), applicationId: janeApp.id, memberId: members.jane.id, loanNo: loanNo(2), principal: 500000, interestRate: 10.0, interestMethod: 'FLAT', totalInterest: 25000, totalAmount: 525000, amountPaid: 87500, balance: 437500, repaymentPeriod: 6, status: LoanStatus.ACTIVE, disbursedAt: new Date(Date.now() - 86400000 * 35), disbursedBy: users.loanOfficer.id, firstDueDate: new Date(Date.now() - 86400000 * 5) },
  });
  const disbJournal2 = await createJournalEntry({
    description: `Loan disbursement - ${members.jane.fullName}`,
    lines: [
      { accountId: accounts.loanReceivables.id, debit: 500000 },
      { accountId: accounts.cashBank.id, credit: 500000 },
    ],
    userId: users.loanOfficer.id,
    date: new Date(Date.now() - 86400000 * 35),
  });
  await prisma.journalEntry.update({ where: { id: disbJournal2.id }, data: { referenceId: janeLoan.id, refType: 'loan_disbursement' } });

  for (let m = 0; m < 6; m++) {
    const total = 87500;
    const principal = 83333, interest = 4167;
    const paid = m < 1 ? total : 0;
    await prisma.loanSchedule.create({
      data: { id: uid(), loanId: janeLoan.id, installment: m + 1, dueDate: new Date(Date.now() - 86400000 * (35 - m * 30)), principal, interest, totalAmount: total, paidAmount: paid, balance: total - paid, status: paid > 0 ? 'PAID' : 'PENDING' },
    });
  }

  const janeRepJournal = await createJournalEntry({
    description: `Loan repayment - ${members.jane.fullName} (installment 1)`,
    lines: [
      { accountId: accounts.cashBank.id, debit: 87500 },
      { accountId: accounts.loanReceivables.id, credit: 83333 },
      { accountId: accounts.interestIncome.id, credit: 4167 },
    ],
    userId: users.treasurer.id,
    date: new Date(Date.now() - 86400000 * 30),
  });
  await prisma.loanRepayment.create({
    data: { id: uid(), loanId: janeLoan.id, memberId: members.jane.id, amount: 87500, principalPortion: 83333, interestPortion: 4167, paymentMethod: 'MOBILE_MONEY', receiptNumber: receiptNo(rn++), journalId: janeRepJournal.id, receivedBy: users.treasurer.id, paidAt: new Date(Date.now() - 86400000 * 30) },
  });

  // Peter: pending loan application
  const peterApp = await prisma.loanApplication.create({
    data: { id: uid(), memberId: members.peter.id, productId: loanProducts.agriculture.id, applicationNo: appNo(3), principal: 2000000, purpose: 'Farm equipment purchase', repaymentPeriod: 24, status: LoanStatus.PENDING, riskScore: 55, submittedAt: new Date(Date.now() - 86400000 * 5) },
  });
  await prisma.loanGuarantor.create({
    data: { id: uid(), applicationId: peterApp.id, guarantorId: members.john.id, amount: 1000000, approved: true, approvedAt: new Date(Date.now() - 86400000 * 3), notes: 'Guarantor approved' },
  });
  await prisma.loanGuarantor.create({
    data: { id: uid(), applicationId: peterApp.id, guarantorId: members.jane.id, amount: 1000000, approved: true, approvedAt: new Date(Date.now() - 86400000 * 2), notes: 'Guarantor approved' },
  });
  await prisma.loanCollateral.create({
    data: { id: uid(), applicationId: peterApp.id, type: 'LAND', description: 'Title deed for plot 22, Gulu', estimatedValue: 5000000, documentRef: 'TITLE-2024-001', isVerified: true },
  });
  console.log('  ✓ Created 3 loan applications with disbursements');

  // ── 9. Share Purchases ───────────────────────────────
  for (const [key, member] of Object.entries(members)) {
    const share = shares[key as keyof typeof shares];
    const units = key === 'john' ? 500 : key === 'jane' ? 300 : 100;
    const pricePerUnit = 1000;
    const totalAmount = units * pricePerUnit;
    const journal = await createJournalEntry({
      description: `Share purchase - ${member.fullName}`,
      lines: [
        { accountId: accounts.cashBank.id, credit: totalAmount },
        { accountId: accounts.shareCapital.id, debit: totalAmount },
      ],
      userId: users.treasurer.id,
      date: new Date(Date.now() - 86400000 * 90 * Math.random()),
    });
    await prisma.sharePurchase.create({
      data: { id: uid(), memberId: member.id, shareId: share.id, units, pricePerUnit, totalAmount, journalId: journal.id, purchasedAt: new Date(Date.now() - 86400000 * 90 * Math.random()) },
    });
  }
  console.log('  ✓ Created 3 share purchase transactions');

  // ── 10. Share Value Record ───────────────────────────
  await prisma.shareValue.create({ data: { id: uid(), pricePerUnit: 1000, effectiveDate: new Date(now.getFullYear(), 0, 1), setBy: users.admin.id, notes: 'Opening share price FY ' + now.getFullYear() } });
  console.log('  ✓ Created share value record');

  // ── 11. Cash Accounts ────────────────────────────────
  await prisma.cashAccount.create({ data: { id: uid(), name: 'Petty Cash', accountType: CashAccountType.PETTY_CASH, balance: 500000, currency: 'UGX' } });
  await prisma.cashAccount.create({ data: { id: uid(), name: 'Stanbic Bank - Main Account', accountType: CashAccountType.BANK, accountNumber: '9030001234567', bankName: 'Stanbic Bank Uganda', branchCode: 'KAMPALA', swiftCode: 'SBICUGKA', balance: 8500000, currency: 'UGX' } });
  await prisma.cashAccount.create({ data: { id: uid(), name: 'MTN Mobile Money', accountType: CashAccountType.MOBILE_MONEY, mobileProvider: 'MTN', mobileNumber: '+256700123456', balance: 2300000, currency: 'UGX' } });
  await prisma.cashAccount.create({ data: { id: uid(), name: 'Airtel Money', accountType: CashAccountType.MOBILE_MONEY, mobileProvider: 'Airtel', mobileNumber: '+256750123456', balance: 1500000, currency: 'UGX' } });
  console.log('  ✓ Created 4 cash accounts');

  // ── 12. Dividends ────────────────────────────────────
  await prisma.dividendDistribution.create({
    data: { id: uid(), financialYear: `${now.getFullYear() - 1}`, totalAmount: 25000000, perUnitAmount: 500, declaredAt: new Date(now.getFullYear() - 1, 11, 15), paidAt: new Date(now.getFullYear(), 0, 31), approvedBy: users.admin.id, status: 'PAID' },
  });
  await prisma.dividendDistribution.create({
    data: { id: uid(), financialYear: `${now.getFullYear() - 2}`, totalAmount: 18000000, perUnitAmount: 350, declaredAt: new Date(now.getFullYear() - 2, 11, 20), paidAt: new Date(now.getFullYear() - 1, 0, 31), approvedBy: users.admin.id, status: 'PAID' },
  });
  console.log('  ✓ Created 2 dividend distributions');

  // ── 13. Governance: Meetings & Resolutions ───────────
  const meeting = await prisma.meeting.create({
    data: { id: uid(), title: 'Annual General Meeting 2025', type: 'AGM', date: new Date(2025, 2, 15), venue: 'Jenga Wealth Conference Hall', agenda: [{ item: 1, title: 'Opening Prayer & Introductions' }, { item: 2, title: 'Reading of Previous Minutes' }, { item: 3, title: 'Chairperson\'s Report' }, { item: 4, title: 'Financial Report' }, { item: 5, title: 'Election of Board Members' }, { item: 6, title: 'AOB' }], status: 'SCHEDULED', createdBy: users.admin.id },
  });
  const pastMeeting = await prisma.meeting.create({
    data: { id: uid(), title: 'Annual General Meeting 2024', type: 'AGM', date: new Date(2024, 2, 15), venue: 'Jenga Wealth Conference Hall', agenda: [{ item: 1, title: 'Opening' }, { item: 2, title: 'Minutes' }, { item: 3, title: 'Reports' }], minutes: 'Meeting proceeded as per agenda. Dividend of UGX 500 per share approved.', status: 'COMPLETED', createdBy: users.admin.id },
  });
  await prisma.resolution.create({
    data: { id: uid(), meetingId: pastMeeting.id, title: 'Approve Dividend Payment FY 2024', description: 'Declare and pay a dividend of UGX 500 per share for FY 2024', status: 'IMPLEMENTED', votesFor: 25, votesAgainst: 3, votesAbstain: 2, createdBy: users.admin.id },
  });
  await prisma.resolution.create({
    data: { id: uid(), meetingId: pastMeeting.id, title: 'Increase Membership Fees', description: 'Increase one-time membership fee from UGX 50,000 to UGX 75,000', status: 'PASSED', votesFor: 20, votesAgainst: 8, votesAbstain: 2, createdBy: users.admin.id },
  });
  await prisma.resolution.create({
    data: { id: uid(), meetingId: meeting.id, title: 'Approve Dividend Payment FY 2025', description: 'Declare dividend based on FY 2025 performance', status: 'PROPOSED', createdBy: users.admin.id },
  });
  console.log('  ✓ Created 2 meetings and 3 resolutions');

  // ── 14. System Config ────────────────────────────────
  const configs = [
    { key: 'sacco.name', value: '"Jenga Wealth"', type: 'STRING', group: 'general', description: 'SACCO display name' },
    { key: 'sacco.tagline', value: '"Building Financial Futures Together"', type: 'STRING', group: 'general' },
    { key: 'sacco.member_fee', value: '50000', type: 'NUMBER', group: 'fees' },
    { key: 'sacco.share_price', value: '1000', type: 'NUMBER', group: 'shares' },
    { key: 'sacco.min_savings_balance', value: '5000', type: 'NUMBER', group: 'savings' },
    { key: 'sacco.max_loan_multiplier', value: '3', type: 'NUMBER', group: 'loans', description: 'Maximum loan as multiple of savings' },
    { key: 'sacco.loan_interest_rate', value: '15', type: 'NUMBER', group: 'loans' },
    { key: 'sacco.late_penalty_rate', value: '2', type: 'NUMBER', group: 'loans' },
    { key: 'sacco.late_penalty_fixed', value: '50000', type: 'NUMBER', group: 'loans' },
  ];
  for (const cfg of configs) {
    await prisma.systemConfig.create({ data: { id: uid(), key: cfg.key, value: cfg.value, type: cfg.type, group: cfg.group, description: cfg.description } });
  }
  console.log('  ✓ Created system configuration');

  // ── 15. Closed FY Journal Entry (Opening Balances) ───
  await createJournalEntry({
    description: 'Opening balance entries for ' + now.getFullYear(),
    lines: [
      { accountId: accounts.cashBank.id, debit: 15000000 },
      { accountId: accounts.loanReceivables.id, debit: 3000000 },
      { accountId: accounts.memberSavings.id, credit: 12000000 },
      { accountId: accounts.shareCapital.id, credit: 3000000 },
      { accountId: accounts.retainedEarnings.id, credit: 3000000 },
    ],
    userId: users.admin.id,
    date: new Date(now.getFullYear(), 0, 1),
  });
  console.log('  ✓ Created opening balance journal entry');

  // ── Summary ──────────────────────────────────────────
  console.log('\n📊  Seed Summary:');
  console.log('   ├─ 8 Users (admin, treasurer, loan_officer, auditor, board_member, 3 members)');
  console.log('   ├─ 3 Members (John Mukasa, Jane Nakato, Peter Okello)');
  console.log('   ├─ 12 Chart of Accounts');
  console.log('   ├─ 2 Financial Periods');
  console.log('   ├─ 3 Savings Products + 5 Loan Products');
  console.log('   ├─ 3 Savings Accounts with deposit history');
  console.log('   ├─ 3 Loan Applications (2 active, 1 pending)');
  console.log('   ├─ 3 Share accounts with purchases');
  console.log('   ├─ 4 Cash Accounts');
  console.log('   ├─ 2 Dividend Distributions');
  console.log('   ├─ 2 Meetings with 3 Resolutions');
  console.log('   └─ 9 System Config entries');
  console.log('\n✅  Seed completed successfully!\n');
  console.log('🔑  Demo credentials:');
  console.log('   Admin:      admin / Admin@123');
  console.log('   Treasurer:  treasurer / Admin@123');
  console.log('   Member:     john / Member@123');
  console.log('   Member:     jane / Member@123');
  console.log('   Member:     peter / Member@123\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
