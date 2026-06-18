'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { PaymentCycle } from '@/lib/types'

export default function TreasurerContributions() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [cycles, setCycles] = useState<PaymentCycle[]>([])

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'treasurer') { router.push('/auth/login'); return }
    setUser(session)
    setCycles(DB.get<PaymentCycle[]>('payment_cycles') || [])
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#E8F5E9]">Contributions</h1>
      <p className="text-sm text-[#8DA88D]">{cycles.length} active payment cycles</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cycles.length === 0 ? (
          <div className="lg:col-span-3 glass p-8 glow text-center">
            <p className="text-[#8DA88D]">No contribution cycles configured.</p>
          </div>
        ) : cycles.map(c => (
          <div key={c.id} className="glass p-5 glow">
            <h3 className="text-[#B6E62E] font-semibold">{c.name}</h3>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-[#8DA88D]">Amount: <span className="text-[#E8F5E9]">{c.amount?.toLocaleString()}</span></p>
              <p className="text-sm text-[#8DA88D]">Frequency: <span className="text-[#E8F5E9]">{c.frequency}</span></p>
              <p className="text-sm text-[#8DA88D]">Period: <span className="text-[#E8F5E9]">{new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}</span></p>
            </div>
            <span className={`inline-block mt-3 text-xs px-2 py-1 rounded-full ${c.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>{c.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
