'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Loan, Member, LoanSchedule } from '@/lib/types'

export default function LoanOfficerActiveLoans() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [loans, setLoans] = useState<(Loan & { memberObj?: Member })[]>([])

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'loan_officer') { router.push('/auth/login'); return }
    setUser(session)
    const members = DB.get<Member[]>('members') || []
    const allLoans = DB.get<Loan[]>('loans') || []
    setLoans(allLoans.filter(l => l.status === 'active' || l.status === 'overdue').map(l => ({
      ...l, memberObj: members.find(m => m.id === l.memberId),
    })))
  }, [])

  const statusColors: Record<string, string> = {
    active: 'badge-blue', overdue: 'badge-red',
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#E8F5E9]">Active Loans</h1>
      <p className="text-sm text-[#8DA88D]">{loans.length} active/overdue loan(s)</p>

      <div className="glass overflow-hidden glow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A3D18]">
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Loan No</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Member</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Type</th>
                <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Principal</th>
                <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Balance</th>
                <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Paid</th>
                <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Progress</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#8DA88D] text-sm">No active loans</td></tr>
              ) : loans.map(l => {
                const total = l.totalPayable || l.totalAmount || l.principal || 0
                const progress = total > 0 ? Math.round(((l.amountPaid || 0) / total) * 100) : 0
                return (
                  <tr key={l.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                    <td className="px-4 py-3 text-sm text-[#B6E62E]">{l.loanNo}</td>
                    <td className="px-4 py-3 text-sm text-[#E8F5E9]">{l.memberObj?.firstName} {l.memberObj?.lastName}</td>
                    <td className="px-4 py-3 text-sm text-[#8DA88D]">{l.loanType}</td>
                    <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{l.principal?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[#F87171] text-right font-mono">{(l.balance || total)?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[#B6E62E] text-right font-mono">{(l.amountPaid || 0)?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-16 bg-[#0A1404] rounded-full h-2">
                          <div className="bg-[#B6E62E] h-2 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs text-[#8DA88D]">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${statusColors[l.status] || 'badge-blue'}`}>{l.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
