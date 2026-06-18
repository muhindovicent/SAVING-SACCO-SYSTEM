'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { SavingsAccount, Loan, Share, SavingsTransaction, LoanSchedule } from '@/lib/types'

export default function MemberDashboard() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const [data, setData] = useState({
    savings: 0, activeLoans: 0, shares: 0, transactions: 0,
    totalPayable: 0, amountPaid: 0, outstandingBalance: 0, totalInterest: 0,
    nextDueDate: '', nextDueAmount: 0, processingFees: 0,
  })
  const [activeLoanList, setActiveLoanList] = useState<Loan[]>([])

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'member') { router.push('/auth/login'); return }
    setUser(session)

    const memberId = session.memberNo || session.userId
    const savings = DB.get<SavingsAccount[]>('savings') || []
    const loans = DB.get<Loan[]>('loans') || []
    const shares = DB.get<Share[]>('shares') || []
    const txns = DB.get<SavingsTransaction[]>('transactions') || []
    const schedules = DB.get<LoanSchedule[]>('loanSchedules') || []

    const mySavings = savings.filter(a => a.memberId === memberId)
    const myLoans = loans.filter(l => l.memberId === memberId)
    const activeLoans = myLoans.filter(l => l.status === 'active' || l.status === 'overdue')
    const myShares = shares.filter(s => s.memberId === memberId)
    const myTxns = txns.filter(t => t.memberId === memberId)

    const totalPayable = activeLoans.reduce((s, l) => s + (l.totalPayable || l.totalAmount || l.principal || 0), 0)
    const amountPaid = activeLoans.reduce((s, l) => s + (l.amountPaid || 0), 0)
    const totalInterest = activeLoans.reduce((s, l) => s + (l.totalInterest || 0), 0)

    // Find next due date
    const myScheduleIds = activeLoans.map(l => l.id)
    const nextPayment = schedules
      .filter(s => myScheduleIds.includes(s.loanId) && s.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]

    setData({
      savings: mySavings.reduce((s, a) => s + (a.balance || 0), 0),
      activeLoans: activeLoans.length,
      shares: myShares.reduce((s, sh) => s + (sh.totalValue || 0), 0),
      transactions: myTxns.length,
      totalPayable,
      amountPaid,
      outstandingBalance: totalPayable - amountPaid,
      totalInterest,
      nextDueDate: nextPayment?.dueDate || '',
      nextDueAmount: nextPayment?.totalAmount || 0,
      processingFees: activeLoans.reduce((s, l) => s + (l.processingFee ? Math.round(l.principal * (l.processingFee / 100)) : 0), 0),
    })
    setActiveLoanList(activeLoans)
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#E8F5E9]">My Dashboard</h1>
        <p className="text-sm text-[#8DA88D]">Welcome back, {user?.name || 'Member'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">My Savings</p>
          <p className="text-2xl font-bold text-[#B6E62E] mt-1">UGX {data.savings.toLocaleString()}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Active Loans</p>
          <p className="text-2xl font-bold text-[#F87171] mt-1">{data.activeLoans}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">My Shares</p>
          <p className="text-2xl font-bold text-[#60A5FA] mt-1">UGX {data.shares.toLocaleString()}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Transactions</p>
          <p className="text-2xl font-bold text-[#FBBF24] mt-1">{data.transactions}</p>
        </div>
      </div>

      {/* Loan Transparency Section */}
      {activeLoanList.length > 0 && (
        <div className="glass p-6 glow">
          <h2 className="text-lg font-semibold text-[#E8F5E9] mb-4">My Loan Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1E2D12] rounded-lg p-4">
              <p className="text-xs text-[#8DA88D]">Loan Amount</p>
              <p className="text-xl font-bold text-[#E8F5E9] mt-1">UGX {(data.totalPayable - data.totalInterest - data.processingFees).toLocaleString()}</p>
            </div>
            <div className="bg-[#1E2D12] rounded-lg p-4">
              <p className="text-xs text-[#8DA88D]">Interest</p>
              <p className="text-xl font-bold text-[#F87171] mt-1">UGX {data.totalInterest.toLocaleString()}</p>
            </div>
            <div className="bg-[#1E2D12] rounded-lg p-4">
              <p className="text-xs text-[#8DA88D]">Processing Fees</p>
              <p className="text-xl font-bold text-[#FBBF24] mt-1">UGX {data.processingFees.toLocaleString()}</p>
            </div>
            <div className="bg-[#1E2D12] rounded-lg p-4">
              <p className="text-xs text-[#8DA88D]">Total Payable</p>
              <p className="text-xl font-bold text-[#E8F5E9] mt-1">UGX {data.totalPayable.toLocaleString()}</p>
            </div>
            <div className="bg-[#1E2D12] rounded-lg p-4">
              <p className="text-xs text-[#8DA88D]">Amount Paid</p>
              <p className="text-xl font-bold text-[#B6E62E] mt-1">UGX {data.amountPaid.toLocaleString()}</p>
            </div>
            <div className="bg-[#1E2D12] rounded-lg p-4">
              <p className="text-xs text-[#8DA88D]">Outstanding Balance</p>
              <p className="text-xl font-bold text-[#F87171] mt-1">UGX {data.outstandingBalance.toLocaleString()}</p>
            </div>
            {data.nextDueDate && (
              <div className="bg-[#1E2D12] rounded-lg p-4">
                <p className="text-xs text-[#8DA88D]">Next Due Date</p>
                <p className="text-xl font-bold text-[#60A5FA] mt-1">{new Date(data.nextDueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            )}
            {data.nextDueAmount > 0 && (
              <div className="bg-[#1E2D12] rounded-lg p-4">
                <p className="text-xs text-[#8DA88D]">Next Due Amount</p>
                <p className="text-xl font-bold text-[#FBBF24] mt-1">UGX {data.nextDueAmount.toLocaleString()}</p>
              </div>
            )}
          </div>

          <h3 className="text-sm font-medium text-[#8DA88D] uppercase mb-3">Active Loans</h3>
          <div className="space-y-3">
            {activeLoanList.map(loan => {
              const total = loan.totalPayable || loan.totalAmount || loan.principal || 0
              const paid = loan.amountPaid || 0
              const progress = total > 0 ? Math.round((paid / total) * 100) : 0
              return (
                <div key={loan.id} className="bg-[#1E2D12] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-[#E8F5E9]">{loan.loanType} - {loan.loanNo}</p>
                      <p className="text-xs text-[#8DA88D]">UGX {loan.principal?.toLocaleString()} @ {loan.interestRate}%</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${loan.status === 'active' ? 'badge-blue' : 'badge-red'}`}>{loan.status}</span>
                  </div>
                  <div className="w-full bg-[#0A1404] rounded-full h-2.5">
                    <div className="bg-[#B6E62E] h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-[#8DA88D]">Paid: UGX {paid.toLocaleString()}</span>
                    <span className="text-xs text-[#8DA88D]">Balance: UGX {(total - paid).toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4">
            <button onClick={() => router.push('/member/loans')} className="text-sm text-[#60A5FA] hover:underline">View all loan details &rarr;</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-6 glow">
          <h2 className="text-lg font-semibold text-[#E8F5E9] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Savings', href: '/member/savings' },
              { label: 'Apply Loan', href: '/member/loans' },
              { label: 'Payments', href: '/member/payments' },
              { label: 'Profile', href: '/member/profile' },
            ].map(a => (
              <button key={a.label} onClick={() => router.push(a.href)}
                className="bg-[#1E2D12] hover:bg-[#2A3D18] border border-[#2A3D18] rounded-lg p-4 text-center transition">
                <p className="text-sm font-medium text-[#E8F5E9]">{a.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="glass p-6 glow">
          <h2 className="text-lg font-semibold text-[#E8F5E9] mb-4">Notifications</h2>
          <p className="text-[#8DA88D] text-sm">No new notifications.</p>
        </div>
      </div>
    </div>
  )
}
