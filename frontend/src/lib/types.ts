export type UserRole = 'admin' | 'treasurer' | 'loan_officer' | 'member'
export type LoanStatus = 'pending' | 'active' | 'repaid' | 'defaulted' | 'rejected' | 'written_off' | 'overdue' | 'approved' | 'draft'
export type TransactionType = 'deposit' | 'withdrawal' | 'interest' | 'fee' | 'transfer_in' | 'transfer_out'
export type PaymentMethod = 'mtn' | 'airtel' | 'bank' | 'cash' | 'payroll' | 'qr'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface User {
  id: string
  email: string
  password: string
  role: UserRole
  name: string
  memberNo?: string
}

export interface Member {
  id: string
  userId: string
  memberNo: string
  firstName: string
  lastName: string
  fullName: string
  phone: string
  email: string
  idNumber: string
  status: string
}

export interface SavingsAccount {
  id: string
  memberId: string
  accountNo: string
  balance: number
  status: string
}

export interface SavingsTransaction {
  id: string
  accountId: string
  memberId: string
  type: TransactionType
  amount: number
  balanceBefore: number
  balanceAfter: number
  reference: string
  description: string
  createdAt: string
}

// ── Loan Product ──

export interface LoanProduct {
  id: string
  name: string
  code: string
  description?: string
  productType: string
  minAmount: number
  maxAmount: number
  interestRate: number
  interestMethod: string
  repaymentPeriod: number
  repaymentFreq: string
  gracePeriod: number
  latePenaltyRate?: number
  latePenaltyFixed?: number
  processingFee?: number
  requiresGuarantor: boolean
  requiresCollateral: boolean
  maxGuarantors: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ── Loan ──

export interface Loan {
  id: string
  memberId: string
  memberNo: string
  memberName: string
  loanNo: string
  loanType: string
  principal: number
  interestRate: number
  interestMethod: string
  totalInterest: number
  totalAmount: number
  processingFee: number
  totalPayable: number
  amountPaid: number
  balance: number
  repaymentPeriod: number
  repaymentFreq: string
  durationMonths: number
  status: LoanStatus
  applicationId: string
  disbursedAt?: string
  firstDueDate?: string
  lastDueDate?: string
  nextDueDate?: string
  nextDueAmount?: number
  paidAt?: string
  progress?: number
  createdAt: string
  product?: LoanProduct
  schedules?: LoanSchedule[]
  repayments?: LoanRepayment[]
  penalties?: LoanPenalty[]
}

// ── Loan Application ──

export interface LoanApplication {
  id: string
  memberId: string
  productId: string
  applicationNo: string
  principal: number
  purpose?: string
  repaymentPeriod: number
  status: LoanStatus
  riskScore?: number
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  submittedAt: string
  updatedAt: string
  product: LoanProduct
  member?: Member
  loan?: Loan
  guarantors?: LoanGuarantor[]
  collaterals?: LoanCollateral[]
  calculation?: LoanCalculation
}

export interface LoanCalculation {
  principal: number
  interestRate: number
  interestMethod: string
  durationMonths: number
  interestAmount: number
  processingFee: number
  processingFeeAmount: number
  totalAmount: number
  totalPayable: number
  monthlyInstallment: number
  schedule?: InstallmentItem[]
}

export interface InstallmentItem {
  installmentNumber: number
  dueDate: string
  principal: number
  interest: number
  totalAmount: number
  remainingBalance: number
}

// ── Loan Schedule ──

export interface LoanSchedule {
  id: string
  loanId: string
  installment: number
  dueDate: string
  principal: number
  interest: number
  fees: number
  totalAmount: number
  paidAmount: number
  balance: number
  status: string
  paidAt?: string
}

// ── Loan Repayment ──

export interface LoanRepayment {
  id: string
  loanId: string
  memberId: string
  amount: number
  principalPortion: number
  interestPortion: number
  penaltyPortion: number
  paymentMethod: PaymentMethod
  reference: string
  notes?: string
  paidAt: string
}

// ── Loan Penalty ──

export interface LoanPenalty {
  id: string
  loanId: string
  amount: number
  reason: string
  daysOverdue: number
  waivedAt?: string
  waivedBy?: string
}

// ── Loan Guarantor ──

export interface LoanGuarantor {
  id: string
  applicationId: string
  guarantorId: string
  amount: number
  approved: boolean
  approvedAt?: string
  notes?: string
}

// ── Loan Collateral ──

export interface LoanCollateral {
  id: string
  applicationId: string
  type: string
  description?: string
  estimatedValue: number
  documentRef?: string
  isVerified: boolean
}

// ── Dashboard Statistics ──

export interface LoanStatistics {
  totalApplications: number
  activeLoans: number
  pendingApplications: number
  paidLoans: number
  overdueLoans: number
  approvedThisMonth: number
  loansDueToday: number
  totalDisbursed: number
  totalOutstanding: number
  totalExpected: number
  totalInterest: number
  interestEarned: number
  collectionRate: number
}

export interface LoanOfficerStatistics {
  pendingApplications: number
  approvedApplications: number
  rejectedApplications: number
  riskAssessment: {
    low: number
    medium: number
    high: number
  }
  repaymentForecast: number
  expectedInterestRevenue: number
}

export interface MemberLoanStatistics {
  totalLoans: number
  totalApplications: number
  activeLoansCount: number
  totalOutstanding: number
  activeLoans: Loan[]
  recentRepayments: LoanRepayment[]
}

export interface TreasurerOverview {
  totalActiveLoans: number
  totalOutstandingAmount: number
  loansDueToday: number
  loansOverdue: number
  loansApprovedThisMonth: number
  loanInterestEarned: number
  totalPortfolioSize: number
}

// ── Other ──

export interface Share {
  id: string
  memberId: string
  totalUnits: number
  unitPrice: number
  totalValue: number
}

export interface ShareTransaction {
  id: string
  memberId: string
  shareId: string
  units: number
  unitPrice: number
  totalAmount: number
  createdAt: string
}

export interface PaymentCycle {
  id: string
  name: string
  amount: number
  frequency: string
  startDate: string
  endDate: string
  status: string
}

export interface PaymentTransaction {
  id: string
  memberId: string
  cycleId: string
  amount: number
  fees: number
  method: PaymentMethod
  status: PaymentStatus
  receiptNo: string
  transRef: string
  createdAt: string
}

export interface JournalEntry {
  id: string
  entryNo: string
  description: string
  totalDebit: number
  totalCredit: number
  postedAt: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}
