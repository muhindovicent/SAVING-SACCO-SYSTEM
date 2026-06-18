'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { PaymentTransaction } from '@/lib/types'

export default function MemberPayments() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [payments, setPayments] = useState<PaymentTransaction[]>([])

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'member') { router.push('/auth/login'); return }
    setUser(session)

    const memberId = session.memberNo || session.userId
    const allPayments = DB.get<PaymentTransaction[]>('payments') || []
    setPayments(allPayments.filter(p => p.memberId === memberId))
  }, [])

  const statusColors: Record<string, string> = {
    completed: 'badge-green', pending: 'badge-yellow', failed: 'badge-red', refunded: 'badge-blue',
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#E8F5E9]">My Payments</h1>
      <p className="text-sm text-[#8DA88D]">{payments.length} payment(s)</p>

      <div className="glass overflow-hidden glow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A3D18]">
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Receipt</th>
                <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Amount</th>
                <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Fees</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Method</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8DA88D] text-sm">No payments found.</td></tr>
              ) : payments.map(p => (
                <tr key={p.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                  <td className="px-4 py-3 text-sm text-[#B6E62E]">{p.receiptNo || p.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{p.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{p.fees?.toLocaleString() || 0}</td>
                  <td className="px-4 py-3 text-sm text-[#8DA88D]">{p.method}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${statusColors[p.status] || 'badge-yellow'}`}>{p.status}</span></td>
                  <td className="px-4 py-3 text-sm text-[#8DA88D]">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
