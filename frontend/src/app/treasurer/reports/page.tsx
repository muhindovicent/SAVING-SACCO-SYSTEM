'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { PaymentTransaction, Loan, SavingsAccount } from '@/lib/types'

export default function TreasurerReports() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'treasurer') { router.push('/auth/login'); return }
    setUser(session)

    const payments = DB.get<PaymentTransaction[]>('payments') || []
    const loans = DB.get<Loan[]>('loans') || []
    const savings = DB.get<SavingsAccount[]>('savings') || []

    setData({
      totalCollected: payments.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0),
      totalFees: payments.reduce((s, p) => s + (p.fees || 0), 0),
      totalDisbursed: loans.filter(l => l.status === 'active' || l.status === 'repaid').reduce((s, l) => s + (l.principal || 0), 0),
      totalRepaid: loans.filter(l => l.status === 'repaid').reduce((s, l) => s + (l.principal || 0), 0),
      totalSavings: savings.reduce((s, a) => s + (a.balance || 0), 0),
      pendingPayments: payments.filter(p => p.status === 'pending').length,
      failedPayments: payments.filter(p => p.status === 'failed').length,
    })
  }, [])

  if (!data) return null

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#E8F5E9]">Financial Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-5 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Total Collected</p>
          <p className="text-2xl font-bold text-[#B6E62E] mt-1">{data.totalCollected.toLocaleString()}</p>
        </div>
        <div className="glass p-5 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Total Disbursed</p>
          <p className="text-2xl font-bold text-[#F87171] mt-1">{data.totalDisbursed.toLocaleString()}</p>
        </div>
        <div className="glass p-5 glow">
          <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Total Savings</p>
          <p className="text-2xl font-bold text-[#60A5FA] mt-1">{data.totalSavings.toLocaleString()}</p>
        </div>
      </div>

      <div className="glass p-6 glow">
        <h2 className="text-lg font-semibold text-[#E8F5E9] mb-4">Detailed Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between"><span className="text-[#8DA88D]">Total Fees Collected</span><span className="text-[#E8F5E9]">{data.totalFees.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-[#8DA88D]">Total Repaid</span><span className="text-[#E8F5E9]">{data.totalRepaid.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-[#8DA88D]">Net Portfolio</span><span className="text-[#E8F5E9]">{(data.totalDisbursed - data.totalRepaid).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-[#8DA88D]">Pending Payments</span><span className="text-yellow-400">{data.pendingPayments}</span></div>
          <div className="flex justify-between"><span className="text-[#8DA88D]">Failed Payments</span><span className="text-red-400">{data.failedPayments}</span></div>
        </div>
      </div>
    </div>
  )
}
