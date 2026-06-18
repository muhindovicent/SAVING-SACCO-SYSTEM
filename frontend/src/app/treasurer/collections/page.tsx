'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Loan, Member, LoanPenalty } from '@/lib/types'

export default function TreasurerPenalties() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [penalties, setPenalties] = useState<(LoanPenalty & { loanNo?: string; memberName?: string })[]>([])
  const [tab, setTab] = useState<'penalties' | 'overdue'>('penalties')
  const [overdueLoans, setOverdueLoans] = useState<(Loan & { memberObj?: Member })[]>([])

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'treasurer') { router.push('/auth/login'); return }
    setUser(session)

    const members = DB.get<Member[]>('members') || []
    const loans = DB.get<Loan[]>('loans') || []
    const allPenalties = DB.get<LoanPenalty[]>('penalties') || []

    const enriched = allPenalties.map(p => {
      const loan = loans.find(l => l.id === p.loanId)
      const member = loan ? members.find(m => m.id === loan.memberId) : null
      return { ...p, loanNo: loan?.loanNo, memberName: member ? `${member.firstName} ${member.lastName}` : 'N/A' }
    })
    setPenalties(enriched)

    setOverdueLoans(loans.filter(l => l.status === 'overdue' || l.status === 'active').map(l => ({
      ...l,
      memberObj: members.find(m => m.id === l.memberId),
    })))
  }, [])

  const calculatePenalties = () => {
    const now = new Date()
    const loans = DB.get<Loan[]>('loans') || []
    const schedules = DB.get<any[]>('loanSchedules') || []
    const allPenalties = DB.get<LoanPenalty[]>('penalties') || []
    const newPenalties: LoanPenalty[] = []

    for (const schedule of schedules) {
      if (schedule.status === 'PAID') continue
      const dueDate = new Date(schedule.dueDate)
      if (dueDate >= now) continue

      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysOverdue <= 0) continue

      const loan = loans.find(l => l.id === schedule.loanId)
      if (!loan) continue

      const existing = allPenalties.find(p => p.loanId === schedule.loanId && p.daysOverdue === daysOverdue)
      if (existing) continue

      const penaltyAmount = daysOverdue * 1000
      if (penaltyAmount > 0) {
        const penalty: LoanPenalty = {
          id: `pen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          loanId: schedule.loanId,
          amount: penaltyAmount,
          reason: `Late payment - ${daysOverdue} days overdue (Schedule #${schedule.installment})`,
          daysOverdue,
        }
        newPenalties.push(penalty)
      }

      // Update schedule status
      const idx = schedules.indexOf(schedule)
      if (idx >= 0) schedules[idx] = { ...schedule, status: 'OVERDUE' }
    }

    // Update loan statuses
    const updatedLoans = loans.map(l =>
      newPenalties.some(p => p.loanId === l.id) ? { ...l, status: 'overdue' as const } : l
    )

    DB.set('penalties', [...allPenalties, ...newPenalties])
    DB.set('loanSchedules', schedules)
    DB.set('loans', updatedLoans)

    const members = DB.get<Member[]>('members') || []
    const enriched = [...allPenalties, ...newPenalties].map(p => {
      const loan = updatedLoans.find(l => l.id === p.loanId)
      const member = loan ? members.find(m => m.id === loan.memberId) : null
      return { ...p, loanNo: loan?.loanNo, memberName: member ? `${member.firstName} ${member.lastName}` : 'N/A' }
    })
    setPenalties(enriched)
    setOverdueLoans(updatedLoans.filter(l => l.status === 'overdue').map(l => ({
      ...l,
      memberObj: members.find(m => m.id === l.memberId),
    })))
  }

  const waivePenalty = (penaltyId: string) => {
    const allPenalties = DB.get<LoanPenalty[]>('penalties') || []
    const updated = allPenalties.map(p => p.id === penaltyId ? { ...p, waivedAt: new Date().toISOString(), waivedBy: 'treasurer' } : p)
    DB.set('penalties', updated)
    setPenalties(prev => prev.map(p => p.id === penaltyId ? { ...p, waivedAt: new Date().toISOString() } : p))
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8F5E9]">Collections & Penalties</h1>
          <p className="text-sm text-[#8DA88D]">Overdue loans and penalty management</p>
        </div>
        <button onClick={calculatePenalties} className="px-4 py-2 bg-[#FBBF24] text-[#0A1404] rounded-lg text-sm font-medium hover:bg-[#F59E0B] transition">
          Auto-Calculate Penalties
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('penalties')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'penalties' ? 'bg-[#B6E62E] text-[#0A1404]' : 'bg-[#1E2D12] text-[#8DA88D]'}`}>Penalties ({penalties.length})</button>
        <button onClick={() => setTab('overdue')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'overdue' ? 'bg-[#B6E62E] text-[#0A1404]' : 'bg-[#1E2D12] text-[#8DA88D]'}`}>Overdue Loans ({overdueLoans.length})</button>
      </div>

      {tab === 'penalties' && (
        <div className="glass overflow-hidden glow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A3D18]">
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Loan No</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Member</th>
                  <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Amount</th>
                  <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Days Overdue</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Reason</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {penalties.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8DA88D] text-sm">No penalties recorded</td></tr>
                ) : penalties.map(p => (
                  <tr key={p.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                    <td className="px-4 py-3 text-sm text-[#B6E62E]">{p.loanNo || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-[#E8F5E9]">{p.memberName}</td>
                    <td className="px-4 py-3 text-sm text-[#F87171] text-right font-mono">UGX {p.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{p.daysOverdue}</td>
                    <td className="px-4 py-3 text-sm text-[#8DA88D] max-w-xs truncate">{p.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${p.waivedAt ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {p.waivedAt ? 'Waived' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!p.waivedAt && (
                        <button onClick={() => waivePenalty(p.id)} className="text-xs bg-[#B6E62E]/20 text-[#B6E62E] px-3 py-1 rounded-lg hover:bg-[#B6E62E]/30 transition">Waive</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'overdue' && (
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
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {overdueLoans.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[#8DA88D] text-sm">No overdue loans</td></tr>
                ) : overdueLoans.map(l => (
                  <tr key={l.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                    <td className="px-4 py-3 text-sm text-[#B6E62E]">{l.loanNo}</td>
                    <td className="px-4 py-3 text-sm text-[#E8F5E9]">{l.memberObj?.firstName} {l.memberObj?.lastName}</td>
                    <td className="px-4 py-3 text-sm text-[#8DA88D]">{l.loanType}</td>
                    <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{l.principal?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[#F87171] text-right font-mono">{(l.balance || l.totalPayable || l.totalAmount || 0)?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[#B6E62E] text-right font-mono">{(l.amountPaid || 0)?.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full badge-red">{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
