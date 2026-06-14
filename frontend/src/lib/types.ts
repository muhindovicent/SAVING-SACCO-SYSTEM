export type UserRole = 'admin' | 'treasurer' | 'member'
export type LoanStatus = 'pending' | 'active' | 'repaid' | 'defaulted' | 'rejected' | 'written_off'
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

export interface Loan {
  id: string
  memberId: string
  memberNo: string
  memberName: string
  loanNo: string
  loanType: string
  principal: number
  interestRate: number
  durationMonths: number
  status: LoanStatus
  createdAt: string
}

export interface LoanRepayment {
  id: string
  loanId: string
  memberId: string
  amount: number
  method: PaymentMethod
  reference: string
  receiptNo: string
  createdAt: string
}

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
