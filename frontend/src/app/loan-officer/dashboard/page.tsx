'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Loan, Member, LoanProduct } from '@/lib/types'

export default function LoanOfficerDashboard() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [stats, setStats] = useState({
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    activeLoans: 0,
    overdueLoans: 0,
    expectedRevenue: 0,
  })

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'loan_officer') { router.push('/auth/login'); return }
    setUser(session)

    const loans = DB.get<Loan[]>('loans') || []
    setStats({
      pendingApplications: loans.filter(l => l.status === 'pending').length,
      approvedApplications: loans.filter(l => l.status === 'approved').length,
      rejectedApplications: loans.filter(l => l.status === 'rejected').length,
      activeLoans: loans.filter(l => l.status === 'active').length,
      overdueLoans: loans.filter(l => l.status === 'overdue').length,
      expectedRevenue: loans.filter(l => l.status === 'active').reduce((s, l) => s + (l.totalInterest || Math.round(l.principal * l.interestRate / 100 * (l.durationMonths / 12))), 0),
    })
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#E8F5E9]">Loan Officer Dashboard</h1>
        <p className="text-sm text-[#8DA88D]">Risk assessment, repayment forecasts, and application overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Pending Applications</p>
          <p className="text-2xl font-bold text-[#FBBF24] mt-1">{stats.pendingApplications}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Approved</p>
          <p className="text-2xl font-bold text-[#60A5FA] mt-1">{stats.approvedApplications}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Rejected</p>
          <p className="text-2xl font-bold text-[#F87171] mt-1">{stats.rejectedApplications}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Active Loans</p>
          <p className="text-2xl font-bold text-[#B6E62E] mt-1">{stats.activeLoans}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Overdue Loans</p>
          <p className="text-2xl font-bold text-[#F87171] mt-1">{stats.overdueLoans}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Expected Interest Revenue</p>
          <p className="text-2xl font-bold text-[#B6E62E] mt-1">UGX {stats.expectedRevenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-6 glow">
          <h2 className="text-lg font-semibold text-[#E8F5E9] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Applications', href: '/loan-officer/applications', color: '#60A5FA' },
              { label: 'Active Loans', href: '/loan-officer/active-loans', color: '#B6E62E' },
              { label: 'Reports', href: '/loan-officer/reports', color: '#FBBF24' },
            ].map(a => (
              <button key={a.label} onClick={() => router.push(a.href)}
                className="bg-[#1E2D12] hover:bg-[#2A3D18] border border-[#2A3D18] rounded-lg p-4 text-center transition">
                <p className="text-sm font-medium text-[#E8F5E9]">{a.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="glass p-6 glow">
          <h2 className="text-lg font-semibold text-[#E8F5E9] mb-4">Risk Assessment Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-[#1E2D12] p-3 rounded-lg">
              <span className="text-sm text-[#8DA88D]">Low Risk (Paid {'>'} 70%)</span>
              <span className="text-lg font-bold text-[#B6E62E]">--</span>
            </div>
            <div className="flex justify-between items-center bg-[#1E2D12] p-3 rounded-lg">
              <span className="text-sm text-[#8DA88D]">Medium Risk (30-70%)</span>
              <span className="text-lg font-bold text-[#FBBF24]">--</span>
            </div>
            <div className="flex justify-between items-center bg-[#1E2D12] p-3 rounded-lg">
              <span className="text-sm text-[#8DA88D]">High Risk ({'<'} 30% Paid)</span>
              <span className="text-lg font-bold text-[#F87171]">--</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
