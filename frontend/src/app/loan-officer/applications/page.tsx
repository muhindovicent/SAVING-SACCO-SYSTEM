'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Loan, Member, LoanProduct } from '@/lib/types'

export default function LoanOfficerApplications() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [loans, setLoans] = useState<(Loan & { memberObj?: Member })[]>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'loan_officer') { router.push('/auth/login'); return }
    setUser(session)
    const members = DB.get<Member[]>('members') || []
    const allLoans = DB.get<Loan[]>('loans') || []
    setLoans(allLoans.map(l => ({ ...l, memberObj: members.find(m => m.id === l.memberId) })))
  }, [])

  const filtered = filter === 'all' ? loans : loans.filter(l => l.status === filter)
  const statusColors: Record<string, string> = {
    pending: 'badge-yellow', active: 'badge-blue', repaid: 'badge-green',
    defaulted: 'badge-red', rejected: 'badge-red', overdue: 'badge-red', approved: 'badge-blue',
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#E8F5E9]">Loan Applications</h1>

      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'approved', 'active', 'overdue', 'rejected', 'repaid'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${filter === s ? 'bg-[#B6E62E] text-[#0A1404]' : 'bg-[#1E2D12] text-[#8DA88D] hover:bg-[#2A3D18]'}`}
          >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      <div className="glass overflow-hidden glow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A3D18]">
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Loan No</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Member</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Type</th>
                <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Principal</th>
                <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Rate</th>
                <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Term</th>
                <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Balance</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#8DA88D] text-sm">No applications found</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                  <td className="px-4 py-3 text-sm text-[#B6E62E]">{l.loanNo}</td>
                  <td className="px-4 py-3 text-sm text-[#E8F5E9]">{l.memberObj?.firstName} {l.memberObj?.lastName}</td>
                  <td className="px-4 py-3 text-sm text-[#8DA88D]">{l.loanType}</td>
                  <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{l.principal?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{l.interestRate}%</td>
                  <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{l.durationMonths}m</td>
                  <td className="px-4 py-3 text-sm text-[#FBBF24] text-right font-mono">{(l.balance || l.totalPayable || l.principal)?.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${statusColors[l.status] || 'badge-yellow'}`}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
