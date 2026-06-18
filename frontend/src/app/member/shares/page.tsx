'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Share, ShareTransaction } from '@/lib/types'
import { SHARE_UNIT_PRICE } from '@/lib/constants'

export default function MemberShares() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [share, setShare] = useState<Share | null>(null)
  const [txns, setTxns] = useState<ShareTransaction[]>([])

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'member') { router.push('/auth/login'); return }
    setUser(session)

    const memberId = session.memberNo || session.userId
    const shares = DB.get<Share[]>('shares') || []
    const myShare = shares.find(s => s.memberId === memberId)
    setShare(myShare || null)

    const allTxns = DB.get<ShareTransaction[]>('share_transactions') || []
    if (myShare) setTxns(allTxns.filter(t => t.shareId === myShare.id).slice(-20))
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#E8F5E9]">My Shares</h1>

      {share ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass p-5 glow">
            <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Total Units</p>
            <p className="text-2xl font-bold text-[#B6E62E] mt-1">{share.totalUnits}</p>
          </div>
          <div className="glass p-5 glow">
            <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Unit Price</p>
            <p className="text-2xl font-bold text-[#60A5FA] mt-1">{share.unitPrice?.toLocaleString()}</p>
          </div>
          <div className="glass p-5 glow">
            <p className="text-[#8DA88D] text-xs uppercase tracking-wider">Total Value</p>
            <p className="text-2xl font-bold text-[#FBBF24] mt-1">{share.totalValue?.toLocaleString()}</p>
          </div>
        </div>
      ) : (
        <div className="glass p-8 glow text-center">
          <p className="text-[#8DA88D]">You have not purchased any shares yet. Contact the admin to buy shares at {SHARE_UNIT_PRICE.toLocaleString()} per unit.</p>
        </div>
      )}

      {txns.length > 0 && (
        <div className="glass overflow-hidden glow">
          <div className="p-4 border-b border-[#2A3D18]">
            <h2 className="text-sm font-semibold text-[#E8F5E9]">Transaction History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A3D18]">
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Date</th>
                  <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Units</th>
                  <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Unit Price</th>
                  <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                    <td className="px-4 py-3 text-sm text-[#8DA88D]">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{t.units}</td>
                    <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{t.unitPrice?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{t.totalAmount?.toLocaleString()}</td>
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
