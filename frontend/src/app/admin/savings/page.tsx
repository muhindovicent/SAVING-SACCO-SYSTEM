'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Member, SavingsAccount, SavingsTransaction } from '@/lib/types'

export default function AdminSavings() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [accounts, setAccounts] = useState<(SavingsAccount & { memberName?: string })[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'admin') { router.push('/auth/login'); return }
    setUser(session)

    const members = DB.get<Member[]>('members') || []
    const savings = DB.get<SavingsAccount[]>('savings') || []
    const enriched = savings.map(a => ({
      ...a,
      memberName: members.find(m => m.id === a.memberId)?.firstName + ' ' + members.find(m => m.id === a.memberId)?.lastName,
    }))
    setAccounts(enriched)
  }, [])

  const filtered = accounts.filter(a =>
    a.accountNo?.toLowerCase().includes(search.toLowerCase()) ||
    a.memberName?.toLowerCase().includes(search.toLowerCase())
  )

  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8F5E9]">Savings Management</h1>
          <p className="text-sm text-[#8DA88D]">{accounts.length} accounts | Total Balance: {totalBalance.toLocaleString()}</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by account no. or member name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full md:w-96 bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] placeholder-[#8DA88D] focus:outline-none focus:border-[#B6E62E]"
      />

      <div className="glass overflow-hidden glow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A3D18]">
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Account No</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Member</th>
                <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Balance</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[#8DA88D] text-sm">No savings accounts found</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                  <td className="px-4 py-3 text-sm text-[#B6E62E]">{a.accountNo}</td>
                  <td className="px-4 py-3 text-sm text-[#E8F5E9]">{a.memberName || 'Unknown'}</td>
                  <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{a.balance?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>{a.status || 'active'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
