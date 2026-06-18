'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Member, Loan, LoanProduct } from '@/lib/types'

function calcInterest(principal: number, rate: number, months: number, method: string, fee: number) {
  let interest = principal * (rate / 100) * (months / 12)
  if (method === 'REDUCING_BALANCE' || method === 'REDUCING') {
    const mr = rate / 100 / 12
    const p = principal * (mr * Math.pow(1 + mr, months)) / (Math.pow(1 + mr, months) - 1)
    interest = Math.ceil(p * months) - principal
  }
  return { interestAmount: Math.round(interest), totalAmount: principal + interest, totalPayable: principal + interest + (fee ? principal * (fee / 100) : 0), feeAmount: fee ? principal * (fee / 100) : 0 }
}

export default function TreasurerDashboard() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [overview, setOverview] = useState({
    totalActiveLoans: 0,
    totalOutstandingAmount: 0,
    loansDueToday: 0,
    loansOverdue: 0,
    loansApprovedThisMonth: 0,
    loanInterestEarned: 0,
    totalPortfolioSize: 0,
    collectionRate: 100,
  })
  const [recentApplications, setRecentApplications] = useState<any[]>([])

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'treasurer') { router.push('/auth/login'); return }
    setUser(session)

    const loans = DB.get<Loan[]>('loans') || []
    const members = DB.get<Member[]>('members') || []
    const products = DB.get<LoanProduct[]>('loanProducts') || []

    const activeLoans = loans.filter(l => l.status === 'active')
    const overdueLoans = loans.filter(l => l.status === 'overdue')
    const pendingLoans = loans.filter(l => l.status === 'pending')
    const approvedThisMonth = loans.filter(l => l.status === 'approved')

    const totalOutstanding = activeLoans.reduce((s, l) => s + (l.balance || l.totalAmount || l.principal || 0), 0) +
      overdueLoans.reduce((s, l) => s + (l.balance || l.totalAmount || l.principal || 0), 0)

    const totalPortfolio = [...activeLoans, ...overdueLoans].reduce((s, l) => s + (l.totalPayable || l.totalAmount || l.principal || 0), 0)
    const totalPaid = [...activeLoans, ...overdueLoans].reduce((s, l) => s + (l.amountPaid || 0), 0)

    const interestEarned = loans.reduce((s, l) => {
      return s + (l.totalInterest || Math.round(l.principal * (l.interestRate / 100) * ((l.durationMonths || 6) / 12)))
    }, 0)

    const today = new Date().toDateString()
    const scheduleItems = DB.get<any[]>('loanSchedules') || []
    const dueToday = scheduleItems.filter(s => new Date(s.dueDate).toDateString() === today && s.status !== 'PAID').length

    setOverview({
      totalActiveLoans: activeLoans.length + overdueLoans.length,
      totalOutstandingAmount: totalOutstanding,
      loansDueToday: dueToday,
      loansOverdue: overdueLoans.length,
      loansApprovedThisMonth: approvedThisMonth.length,
      loanInterestEarned: interestEarned,
      totalPortfolioSize: totalPortfolio,
      collectionRate: totalPortfolio > 0 ? Math.round((totalPaid / totalPortfolio) * 100) : 100,
    })

    setRecentApplications(pendingLoans.slice(0, 5).map(l => ({
      ...l,
      memberName: members.find(m => m.id === l.memberId)?.firstName + ' ' + members.find(m => m.id === l.memberId)?.lastName || 'N/A',
    })))
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#E8F5E9]">Treasurer Dashboard</h1>
        <p className="text-sm text-[#8DA88D]">Loan portfolio overview and financial summary</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Total Active Loans</p>
          <p className="text-2xl font-bold text-[#60A5FA] mt-1">{overview.totalActiveLoans}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Outstanding Amount</p>
          <p className="text-2xl font-bold text-[#F87171] mt-1">UGX {overview.totalOutstandingAmount.toLocaleString()}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Loans Due Today</p>
          <p className="text-2xl font-bold text-[#FBBF24] mt-1">{overview.loansDueToday}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Loans Overdue</p>
          <p className="text-2xl font-bold text-[#F87171] mt-1">{overview.loansOverdue}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Approved This Month</p>
          <p className="text-2xl font-bold text-[#B6E62E] mt-1">{overview.loansApprovedThisMonth}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Interest Earned</p>
          <p className="text-2xl font-bold text-[#B6E62E] mt-1">UGX {overview.loanInterestEarned.toLocaleString()}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Portfolio Size</p>
          <p className="text-2xl font-bold text-[#E8F5E9] mt-1">UGX {overview.totalPortfolioSize.toLocaleString()}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Collection Rate</p>
          <p className="text-2xl font-bold text-[#B6E62E] mt-1">{overview.collectionRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-6 glow">
          <h2 className="text-lg font-semibold text-[#E8F5E9] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Pending Approvals', href: '/treasurer/approvals', color: '#60A5FA' },
              { label: 'Collections', href: '/treasurer/collections', color: '#B6E62E' },
              { label: 'Contributions', href: '/treasurer/contributions', color: '#FBBF24' },
              { label: 'Reports', href: '/treasurer/reports', color: '#F87171' },
            ].map(a => (
              <button key={a.label} onClick={() => router.push(a.href)}
                className="bg-[#1E2D12] hover:bg-[#2A3D18] border border-[#2A3D18] rounded-lg p-4 text-center transition">
                <p className="text-sm font-medium text-[#E8F5E9]">{a.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="glass p-6 glow">
          <h2 className="text-lg font-semibold text-[#E8F5E9] mb-4">Pending Loan Applications</h2>
          {recentApplications.length === 0 ? (
            <p className="text-[#8DA88D] text-sm">No pending applications.</p>
          ) : (
            <div className="space-y-2">
              {recentApplications.map(app => (
                <div key={app.id} className="flex items-center justify-between bg-[#1E2D12] p-3 rounded-lg">
                  <div>
                    <p className="text-sm text-[#E8F5E9]">{app.memberName}</p>
                    <p className="text-xs text-[#8DA88D]">{app.loanType} - UGX {app.principal?.toLocaleString()}</p>
                  </div>
                  <button onClick={() => router.push('/treasurer/approvals')} className="text-xs bg-[#B6E62E]/20 text-[#B6E62E] px-3 py-1 rounded-lg">Review</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
