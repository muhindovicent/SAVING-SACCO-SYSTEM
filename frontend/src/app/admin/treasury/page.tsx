'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'

interface CashAccount {
  id: string; name: string; type: string; balance: number; status: string
}

export default function AdminTreasury() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [accounts, setAccounts] = useState<CashAccount[]>([])

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'admin') { router.push('/auth/login'); return }
    setUser(session)
    setAccounts(DB.get<CashAccount[]>('treasury_cash_accounts') || [])
  }, [])

  const totalCash = accounts.reduce((s, a) => s + (a.balance || 0), 0)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8F5E9]">Treasury</h1>
          <p className="text-sm text-[#8DA88D]">Total Cash: {totalCash.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.length === 0 ? (
          <div className="md:col-span-3 glass p-8 glow text-center">
            <p className="text-[#8DA88D]">No cash accounts configured yet.</p>
          </div>
        ) : accounts.map(a => (
          <div key={a.id} className="glass p-5 glow">
            <p className="text-[#8DA88D] text-xs uppercase tracking-wider">{a.name}</p>
            <p className="text-2xl font-bold text-[#B6E62E] mt-1">{a.balance?.toLocaleString()}</p>
            <p className="text-xs text-[#8DA88D] mt-1">{a.type}</p>
          </div>
        ))}
      </div>

      {accounts.length > 0 && (
        <div className="glass overflow-hidden glow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A3D18]">
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Account</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Balance</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                    <td className="px-4 py-3 text-sm text-[#E8F5E9]">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-[#8DA88D]">{a.type}</td>
                    <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{a.balance?.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${a.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>{a.status}</span></td>
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
