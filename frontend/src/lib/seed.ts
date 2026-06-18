import DB from '@/services/db'
import type { User, Member, SavingsAccount, Loan, LoanProduct, Share, PaymentTransaction, PaymentCycle, SavingsTransaction, ShareTransaction } from '@/lib/types'

export function seedDemoData(): boolean {
  if (DB.get('users')) return false

  const users: User[] = [
    { id: 'u1', email: 'admin@jengawealth.com', password: 'Admin@123', role: 'admin', name: 'Admin User', memberNo: '' },
    { id: 'u2', email: 'treasurer@jengawealth.com', password: 'Admin@123', role: 'treasurer', name: 'Treasurer User', memberNo: '' },
    { id: 'u6', email: 'loanofficer@jengawealth.com', password: 'Admin@123', role: 'loan_officer', name: 'Loan Officer', memberNo: '' },
    { id: 'u3', email: 'john@jengawealth.com', password: 'Member@123', role: 'member', name: 'John Doe', memberNo: 'M001' },
    { id: 'u4', email: 'jane@jengawealth.com', password: 'Member@123', role: 'member', name: 'Jane Smith', memberNo: 'M002' },
    { id: 'u5', email: 'bob@jengawealth.com', password: 'Member@123', role: 'member', name: 'Bob Johnson', memberNo: 'M003' },
  ]
  DB.set('users', users)

  const members: Member[] = [
    { id: 'm1', userId: 'u3', memberNo: 'M001', firstName: 'John', lastName: 'Doe', phone: '+256701234567', email: 'john@jengawealth.com', idNumber: 'CM123456', status: 'active' },
    { id: 'm2', userId: 'u4', memberNo: 'M002', firstName: 'Jane', lastName: 'Smith', phone: '+256702345678', email: 'jane@jengawealth.com', idNumber: 'CM234567', status: 'active' },
    { id: 'm3', userId: 'u5', memberNo: 'M003', firstName: 'Bob', lastName: 'Johnson', phone: '+256703456789', email: 'bob@jengawealth.com', idNumber: 'CM345678', status: 'active' },
  ]
  DB.set('members', members)

  const savings: SavingsAccount[] = [
    { id: 's1', memberId: 'm1', accountNo: 'SAV-001', balance: 2500000, status: 'active' },
    { id: 's2', memberId: 'm2', accountNo: 'SAV-002', balance: 1800000, status: 'active' },
    { id: 's3', memberId: 'm3', accountNo: 'SAV-003', balance: 3200000, status: 'active' },
  ]
  DB.set('savings', savings)

  const loanProducts: LoanProduct[] = [
    { id: 'lp1', name: 'Emergency Loan', code: 'EMERGENCY', description: 'Quick emergency loans for urgent needs', productType: 'REGULAR', minAmount: 50000, maxAmount: 1000000, interestRate: 3, interestMethod: 'FLAT', repaymentPeriod: 6, repaymentFreq: 'MONTHLY', gracePeriod: 0, latePenaltyRate: 2, latePenaltyFixed: 10000, processingFee: 0, requiresGuarantor: false, requiresCollateral: false, maxGuarantors: 2, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'lp2', name: 'Development Loan', code: 'DEVELOPMENT', description: 'Long-term development and business loans', productType: 'REGULAR', minAmount: 100000, maxAmount: 10000000, interestRate: 5, interestMethod: 'FLAT', repaymentPeriod: 24, repaymentFreq: 'MONTHLY', gracePeriod: 0, latePenaltyRate: 5, latePenaltyFixed: 25000, processingFee: 0, requiresGuarantor: true, requiresCollateral: false, maxGuarantors: 2, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'lp3', name: 'Agriculture Loan', code: 'AGRICULTURE', description: 'Farm and agriculture financing', productType: 'AGRICULTURE', minAmount: 100000, maxAmount: 5000000, interestRate: 4, interestMethod: 'REDUCING_BALANCE', repaymentPeriod: 12, repaymentFreq: 'MONTHLY', gracePeriod: 30, latePenaltyRate: 3, latePenaltyFixed: 15000, processingFee: 1, requiresGuarantor: true, requiresCollateral: true, maxGuarantors: 2, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'lp4', name: 'Education Loan', code: 'EDUCATION', description: 'School fees and education expenses', productType: 'EDUCATION', minAmount: 50000, maxAmount: 3000000, interestRate: 2, interestMethod: 'FLAT', repaymentPeriod: 12, repaymentFreq: 'MONTHLY', gracePeriod: 0, latePenaltyRate: 2, latePenaltyFixed: 5000, processingFee: 0, requiresGuarantor: false, requiresCollateral: false, maxGuarantors: 1, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ]
  DB.set('loanProducts', loanProducts)

  const loans: Loan[] = [
    { id: 'l1', memberId: 'm1', memberNo: 'M001', memberName: 'John Doe', loanNo: 'LN-001', loanType: 'Emergency Loan', principal: 500000, interestRate: 3, interestMethod: 'FLAT', totalInterest: 7500, totalAmount: 507500, processingFee: 0, totalPayable: 507500, amountPaid: 169167, balance: 338333, repaymentPeriod: 6, repaymentFreq: 'MONTHLY', durationMonths: 6, status: 'active', applicationId: '', firstDueDate: new Date(Date.now() + 86400000 * 30).toISOString(), lastDueDate: new Date(Date.now() + 86400000 * 180).toISOString(), disbursedAt: new Date(Date.now() - 86400000 * 60).toISOString(), createdAt: new Date(Date.now() - 86400000 * 90).toISOString(), progress: 33 },
    { id: 'l2', memberId: 'm2', memberNo: 'M002', memberName: 'Jane Smith', loanNo: 'LN-002', loanType: 'Development Loan', principal: 2000000, interestRate: 5, interestMethod: 'FLAT', totalInterest: 100000, totalAmount: 2100000, processingFee: 0, totalPayable: 2100000, amountPaid: 350000, balance: 1750000, repaymentPeriod: 12, repaymentFreq: 'MONTHLY', durationMonths: 12, status: 'active', applicationId: '', firstDueDate: new Date(Date.now() + 86400000 * 30).toISOString(), lastDueDate: new Date(Date.now() + 86400000 * 365).toISOString(), disbursedAt: new Date(Date.now() - 86400000 * 90).toISOString(), createdAt: new Date(Date.now() - 86400000 * 120).toISOString(), progress: 17 },
    { id: 'l3', memberId: 'm3', memberNo: 'M003', memberName: 'Bob Johnson', loanNo: 'LN-003', loanType: 'Emergency Loan', principal: 300000, interestRate: 3, interestMethod: 'FLAT', totalInterest: 2250, totalAmount: 302250, processingFee: 0, totalPayable: 302250, amountPaid: 302250, balance: 0, repaymentPeriod: 3, repaymentFreq: 'MONTHLY', durationMonths: 3, status: 'repaid', applicationId: '', firstDueDate: new Date(Date.now() - 86400000 * 60).toISOString(), lastDueDate: new Date(Date.now() - 86400000 * 1).toISOString(), disbursedAt: new Date(Date.now() - 86400000 * 150).toISOString(), paidAt: new Date(Date.now() - 86400000 * 1).toISOString(), createdAt: new Date(Date.now() - 86400000 * 180).toISOString(), progress: 100 },
    { id: 'l4', memberId: 'm1', memberNo: 'M001', memberName: 'John Doe', loanNo: 'LN-004', loanType: 'Education Loan', principal: 1500000, interestRate: 2, interestMethod: 'FLAT', totalInterest: 30000, totalAmount: 1530000, processingFee: 0, totalPayable: 1530000, amountPaid: 0, balance: 1530000, repaymentPeriod: 12, repaymentFreq: 'MONTHLY', durationMonths: 12, status: 'pending', applicationId: '', firstDueDate: '', lastDueDate: '', createdAt: new Date().toISOString(), progress: 0 },
    { id: 'l5', memberId: 'm2', memberNo: 'M002', memberName: 'Jane Smith', loanNo: 'LN-005', loanType: 'Agriculture Loan', principal: 800000, interestRate: 4, interestMethod: 'REDUCING_BALANCE', totalInterest: 17455, totalAmount: 817455, processingFee: 1, totalPayable: 825455, amountPaid: 0, balance: 825455, repaymentPeriod: 6, repaymentFreq: 'MONTHLY', durationMonths: 6, status: 'approved', applicationId: '', firstDueDate: '', lastDueDate: '', createdAt: new Date().toISOString(), progress: 0 },
  ]
  DB.set('loans', loans)

  const shares: Share[] = [
    { id: 'sh1', memberId: 'm1', totalUnits: 100, unitPrice: 1000, totalValue: 100000 },
    { id: 'sh2', memberId: 'm2', totalUnits: 50, unitPrice: 1000, totalValue: 50000 },
    { id: 'sh3', memberId: 'm3', totalUnits: 200, unitPrice: 1000, totalValue: 200000 },
  ]
  DB.set('shares', shares)

  const payments: PaymentTransaction[] = [
    { id: 'p1', memberId: 'm1', cycleId: 'c1', amount: 50000, fees: 500, method: 'mtn', status: 'completed', receiptNo: 'RCP-001', transRef: 'TRX-001', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'p2', memberId: 'm2', cycleId: 'c1', amount: 50000, fees: 500, method: 'bank', status: 'completed', receiptNo: 'RCP-002', transRef: 'TRX-002', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'p3', memberId: 'm3', cycleId: 'c1', amount: 50000, fees: 500, method: 'cash', status: 'pending', receiptNo: 'RCP-003', transRef: 'TRX-003', createdAt: new Date(Date.now() - 86400000 * 1).toISOString() },
  ]
  DB.set('payments', payments)

  const cycles: PaymentCycle[] = [
    { id: 'c1', name: 'Monthly Contribution - Q2 2026', amount: 50000, frequency: 'monthly', startDate: new Date(2026, 3, 1).toISOString(), endDate: new Date(2026, 5, 30).toISOString(), status: 'active' },
  ]
  DB.set('payment_cycles', cycles)

  const txns: SavingsTransaction[] = [
    { id: 't1', accountId: 's1', memberId: 'm1', type: 'deposit', amount: 500000, balanceBefore: 2000000, balanceAfter: 2500000, reference: 'DEP-001', description: 'Monthly deposit', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 't2', accountId: 's1', memberId: 'm1', type: 'withdrawal', amount: 100000, balanceBefore: 2600000, balanceAfter: 2500000, reference: 'WTH-001', description: 'Emergency withdrawal', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: 't3', accountId: 's2', memberId: 'm2', type: 'deposit', amount: 300000, balanceBefore: 1500000, balanceAfter: 1800000, reference: 'DEP-002', description: 'Salary deposit', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 't4', accountId: 's3', memberId: 'm3', type: 'interest', amount: 50000, balanceBefore: 3150000, balanceAfter: 3200000, reference: 'INT-001', description: 'Quarterly interest', createdAt: new Date(Date.now() - 86400000 * 1).toISOString() },
  ]
  DB.set('transactions', txns)

  const shareTxns: ShareTransaction[] = [
    { id: 'st1', memberId: 'm1', shareId: 'sh1', units: 50, unitPrice: 1000, totalAmount: 50000, createdAt: new Date(Date.now() - 86400000 * 90).toISOString() },
    { id: 'st2', memberId: 'm1', shareId: 'sh1', units: 50, unitPrice: 1000, totalAmount: 50000, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: 'st3', memberId: 'm2', shareId: 'sh2', units: 50, unitPrice: 1000, totalAmount: 50000, createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
  ]
  DB.set('share_transactions', shareTxns)

  const cashAccounts = [
    { id: 'ca1', name: 'Main Cash Account', type: 'Cash', balance: 50000000, status: 'active' },
    { id: 'ca2', name: 'Mobile Money (MTN)', type: 'Mobile Money', balance: 15000000, status: 'active' },
    { id: 'ca3', name: 'Bank Account - Stanbic', type: 'Bank', balance: 75000000, status: 'active' },
  ]
  DB.set('treasury_cash_accounts', cashAccounts)

  const meetings = [
    { id: 'mt1', title: 'Annual General Meeting 2026', date: new Date(2026, 6, 15).toISOString(), type: 'AGM', venue: 'Main Hall', status: 'scheduled', minutes: '' },
    { id: 'mt2', title: 'Board Meeting - Q1 Review', date: new Date(2026, 2, 10).toISOString(), type: 'Board', venue: 'Board Room', status: 'completed', minutes: 'Discussed Q1 performance and growth strategy.' },
  ]
  DB.set('meetings', meetings)

  const resolutions = [
    { id: 'r1', title: 'Approve Annual Budget 2026', description: 'Approve the annual operating budget for FY 2026', proposedBy: 'Board Chair', status: 'passed', meetingId: 'mt2', createdAt: new Date(2026, 2, 10).toISOString() },
    { id: 'r2', title: 'Dividend Declaration', description: 'Declare dividend of 5% per share for FY 2025', proposedBy: 'Treasurer', status: 'pending', meetingId: 'mt1', createdAt: new Date(2026, 5, 1).toISOString() },
  ]
  DB.set('resolutions', resolutions)

  const notifications = [
    { id: 'n1', userId: 'u3', title: 'Loan Approved', message: 'Your emergency loan LN-001 has been approved.', type: 'success', isRead: false, createdAt: new Date().toISOString() },
    { id: 'n2', userId: 'u3', title: 'Deposit Confirmed', message: 'Your deposit of 500,000 has been credited.', type: 'info', isRead: false, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'n3', userId: 'u4', title: 'Payment Due', message: 'Your monthly contribution of 50,000 is due in 3 days.', type: 'warning', isRead: true, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  ]
  DB.set('notifications', notifications)

  DB.set('system_settings', { savingsRate: 2.5, loanRate: 12, sharePrice: 1000, orgName: 'Jenga Wealth' })

  return true
}
