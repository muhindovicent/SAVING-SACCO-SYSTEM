'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Loan, Member, LoanProduct } from '@/lib/types'

export default function AdminLoans() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [loans, setLoans] = useState<(Loan & { memberName?: string })[]>([])
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [filter, setFilter] = useState('all')
  const [tab, setTab] = useState<'loans' | 'products'>('loans')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', interestRate: 5, maxAmount: 1000000, repaymentPeriod: 6, processingFee: 0, latePenaltyRate: 2, description: '', interestMethod: 'FLAT' })

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'admin') { router.push('/auth/login'); return }
    setUser(session)

    const members = DB.get<Member[]>('members') || []
    const allLoans = DB.get<Loan[]>('loans') || []
    const enriched = allLoans.map(l => ({
      ...l,
      memberName: members.find(m => m.id === l.memberId)?.firstName + ' ' + members.find(m => m.id === l.memberId)?.lastName,
    }))
    setLoans(enriched)
    setProducts(DB.get<LoanProduct[]>('loanProducts') || [])
  }, [])

  const statusColors: Record<string, string> = {
    pending: 'badge-yellow', active: 'badge-blue', repaid: 'badge-green',
    defaulted: 'badge-red', rejected: 'badge-red', written_off: 'badge-red', overdue: 'badge-red', approved: 'badge-blue',
  }

  const createProduct = () => {
    const product: LoanProduct = {
      id: `prod-${Date.now()}`,
      ...form,
      minAmount: 0,
      productType: 'REGULAR',
      repaymentFreq: 'MONTHLY',
      gracePeriod: 0,
      latePenaltyFixed: 0,
      requiresGuarantor: false,
      requiresCollateral: false,
      maxGuarantors: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const all = [...products, product]
    DB.set('loanProducts', all)
    setProducts(all)
    setShowForm(false)
    setForm({ name: '', code: '', interestRate: 5, maxAmount: 1000000, repaymentPeriod: 6, processingFee: 0, latePenaltyRate: 2, description: '', interestMethod: 'FLAT' })
  }

  const toggleProduct = (id: string) => {
    const all = products.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p)
    DB.set('loanProducts', all)
    setProducts(all)
  }

  const filtered = filter === 'all' ? loans : loans.filter(l => l.status === filter)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8F5E9]">Loans Management</h1>
          <p className="text-sm text-[#8DA88D]">{loans.length} total loans</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('loans')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'loans' ? 'bg-[#B6E62E] text-[#0A1404]' : 'bg-[#1E2D12] text-[#8DA88D]'}`}>Loans</button>
        <button onClick={() => setTab('products')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'products' ? 'bg-[#B6E62E] text-[#0A1404]' : 'bg-[#1E2D12] text-[#8DA88D]'}`}>Loan Products</button>
      </div>

      {tab === 'loans' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'active', 'overdue', 'repaid', 'rejected'].map(s => (
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
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-[#8DA88D] text-sm">No loans found</td></tr>
                  ) : filtered.map(l => (
                    <tr key={l.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                      <td className="px-4 py-3 text-sm text-[#B6E62E]">{l.loanNo}</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9]">{l.memberName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-[#8DA88D]">{l.loanType}</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{l.principal?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{l.interestRate}%</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{l.durationMonths}m</td>
                      <td className="px-4 py-3 text-sm text-[#F87171] text-right font-mono">{l.balance?.toLocaleString() || '0'}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${statusColors[l.status] || 'badge-yellow'}`}>{l.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#B6E62E] text-[#0A1404] rounded-lg text-sm font-medium hover:bg-[#9CCC2A] transition">
              {showForm ? 'Cancel' : '+ New Product'}
            </button>
          </div>

          {showForm && (
            <div className="glass p-6 glow space-y-4">
              <h3 className="text-lg font-semibold text-[#E8F5E9]">Create Loan Product</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-[#8DA88D] block mb-1">Product Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" placeholder="Emergency Loan" />
                </div>
                <div>
                  <label className="text-xs text-[#8DA88D] block mb-1">Code</label>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" placeholder="EMERGENCY" />
                </div>
                <div>
                  <label className="text-xs text-[#8DA88D] block mb-1">Description</label>
                  <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" placeholder="Short-term emergency loans" />
                </div>
                <div>
                  <label className="text-xs text-[#8DA88D] block mb-1">Interest Rate (%)</label>
                  <input type="number" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: Number(e.target.value) })} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
                </div>
                <div>
                  <label className="text-xs text-[#8DA88D] block mb-1">Interest Method</label>
                  <select value={form.interestMethod} onChange={e => setForm({ ...form, interestMethod: e.target.value })} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]">
                    <option value="FLAT">Flat Rate</option>
                    <option value="REDUCING_BALANCE">Reducing Balance</option>
                    <option value="COMPOUND">Compound Interest</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#8DA88D] block mb-1">Maximum Amount (UGX)</label>
                  <input type="number" value={form.maxAmount} onChange={e => setForm({ ...form, maxAmount: Number(e.target.value) })} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
                </div>
                <div>
                  <label className="text-xs text-[#8DA88D] block mb-1">Max Duration (Months)</label>
                  <input type="number" value={form.repaymentPeriod} onChange={e => setForm({ ...form, repaymentPeriod: Number(e.target.value) })} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
                </div>
                <div>
                  <label className="text-xs text-[#8DA88D] block mb-1">Processing Fee (%)</label>
                  <input type="number" value={form.processingFee} onChange={e => setForm({ ...form, processingFee: Number(e.target.value) })} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
                </div>
                <div>
                  <label className="text-xs text-[#8DA88D] block mb-1">Late Penalty Rate (%)</label>
                  <input type="number" value={form.latePenaltyRate} onChange={e => setForm({ ...form, latePenaltyRate: Number(e.target.value) })} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
                </div>
              </div>
              <button onClick={createProduct} disabled={!form.name || !form.code} className="px-6 py-2 bg-[#B6E62E] text-[#0A1404] rounded-lg text-sm font-medium hover:bg-[#9CCC2A] transition disabled:opacity-50">Create Product</button>
            </div>
          )}

          <div className="glass overflow-hidden glow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2A3D18]">
                    <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Code</th>
                    <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Rate</th>
                    <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Method</th>
                    <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Max Amount</th>
                    <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Max Duration</th>
                    <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Fee</th>
                    <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Penalty</th>
                    <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-[#8DA88D] text-sm">No loan products. Create one.</td></tr>
                  ) : products.map(p => (
                    <tr key={p.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                      <td className="px-4 py-3 text-sm text-[#E8F5E9]">{p.name}</td>
                      <td className="px-4 py-3 text-sm text-[#B6E62E]">{p.code}</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{p.interestRate}%</td>
                      <td className="px-4 py-3 text-sm text-[#8DA88D]">{p.interestMethod}</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{p.maxAmount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{p.repaymentPeriod}m</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{p.processingFee || 0}%</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{p.latePenaltyRate || 0}%</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${p.isActive ? 'badge-green' : 'badge-red'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleProduct(p.id)} className={`text-xs px-2 py-1 rounded-lg ${p.isActive ? 'bg-red-500/20 text-red-400' : 'bg-[#B6E62E]/20 text-[#B6E62E]'} hover:opacity-80 transition`}>
                          {p.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
