'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { User, Member, SavingsAccount, Loan, Share } from '@/lib/types'

export default function AdminDashboard() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const [stats, setStats] = useState({ members: 0, savings: 0, loans: 0, shares: 0 })

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'admin') { router.push('/auth/login'); return }
    setUser(session)

    const members = (DB.get<Member[]>('members') || []).length
    const savings = (DB.get<SavingsAccount[]>('savings') || []).reduce((s, a) => s + (a.balance || 0), 0)
    const loans = (DB.get<Loan[]>('loans') || []).filter(l => l.status === 'active').reduce((s, l) => s + (l.principal || 0), 0)
    const shares = (DB.get<Share[]>('shares') || []).reduce((s, sh) => s + (sh.totalValue || 0), 0)
    setStats({ members, savings, loans, shares })
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#E8F5E9]">Admin Dashboard</h1>
        <p className="text-sm text-[#8DA88D]">Welcome back, {user?.name || 'Admin'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Members</p>
          <p className="text-2xl font-bold text-[#B6E62E] mt-1">{stats.members}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Total Savings</p>
          <p className="text-2xl font-bold text-[#B6E62E] mt-1">{stats.savings.toLocaleString()}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Active Loans</p>
          <p className="text-2xl font-bold text-[#B6E62E] mt-1">{stats.loans.toLocaleString()}</p>
        </div>
        <div className="glass p-4 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Share Capital</p>
          <p className="text-2xl font-bold text-[#B6E62E] mt-1">{stats.shares.toLocaleString()}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass p-6 glow">
        <h2 className="text-lg font-semibold text-[#E8F5E9] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Members', href: '/admin/members', color: '#B6E62E' },
            { label: 'Savings', href: '/admin/savings', color: '#60A5FA' },
            { label: 'Loans', href: '/admin/loans', color: '#FBBF24' },
            { label: 'Reports', href: '/admin/reports', color: '#F87171' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="bg-[#1E2D12] hover:bg-[#2A3D18] border border-[#2A3D18] rounded-lg p-4 text-center transition"
            >
              <p className="text-sm font-medium text-[#E8F5E9]">{action.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="glass p-6 glow">
        <h2 className="text-lg font-semibold text-[#E8F5E9] mb-4">Recent Activity</h2>
        <p className="text-[#8DA88D] text-sm">No recent activity to display.</p>
      </div>
    </div>
  )
}
