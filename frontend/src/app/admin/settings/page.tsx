'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import { APP_NAME, SAVINGS_INTEREST_RATE, LOAN_INTEREST_RATE, SHARE_UNIT_PRICE } from '@/lib/constants'

export default function AdminSettings() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [settings, setSettings] = useState({
    savingsRate: SAVINGS_INTEREST_RATE,
    loanRate: LOAN_INTEREST_RATE,
    sharePrice: SHARE_UNIT_PRICE,
    orgName: APP_NAME,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'admin') { router.push('/auth/login'); return }
    setUser(session)
    const stored = DB.get<any>('system_settings')
    if (stored) setSettings(stored)
  }, [])

  const handleSave = () => {
    DB.set('system_settings', settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#E8F5E9]">System Settings</h1>

      <div className="glass p-6 glow max-w-2xl space-y-5">
        <div>
          <label className="block text-sm text-[#8DA88D] mb-1">Organization Name</label>
          <input type="text" value={settings.orgName} onChange={e => setSettings({ ...settings, orgName: e.target.value })}
            className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
        </div>
        <div>
          <label className="block text-sm text-[#8DA88D] mb-1">Savings Interest Rate (%)</label>
          <input type="number" step="0.1" value={settings.savingsRate} onChange={e => setSettings({ ...settings, savingsRate: +e.target.value })}
            className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
        </div>
        <div>
          <label className="block text-sm text-[#8DA88D] mb-1">Loan Interest Rate (%)</label>
          <input type="number" step="0.1" value={settings.loanRate} onChange={e => setSettings({ ...settings, loanRate: +e.target.value })}
            className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
        </div>
        <div>
          <label className="block text-sm text-[#8DA88D] mb-1">Share Unit Price</label>
          <input type="number" value={settings.sharePrice} onChange={e => setSettings({ ...settings, sharePrice: +e.target.value })}
            className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
        </div>
        <button onClick={handleSave}
          className="bg-[#B6E62E] text-[#0A1404] font-semibold px-6 py-2.5 rounded-lg hover:bg-[#9DCB1F] transition text-sm">
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
