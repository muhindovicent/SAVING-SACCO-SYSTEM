'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Member, Loan, LoanProduct, LoanSchedule, LoanRepayment, LoanPenalty } from '@/lib/types'

function getMemberId(): string | null {
  const members = DB.get<Member[]>('members') || []
  const session = getSession()
  if (!session) return null
  const member = members.find(m => m.userId === session.userId)
  return member ? member.id : null
}

function calculateLoan(principal: number, rate: number, months: number, method: string, fee: number) {
  let interest: number
  let total: number

  if (method === 'FLAT') {
    interest = principal * (rate / 100) * (months / 12)
    total = principal + interest
  } else if (method === 'REDUCING_BALANCE' || method === 'REDUCING') {
    const mr = rate / 100 / 12
    const payment = principal * (mr * Math.pow(1 + mr, months)) / (Math.pow(1 + mr, months) - 1)
    total = Math.ceil(payment * months)
    interest = total - principal
  } else {
    interest = principal * (rate / 100) * (months / 12)
    total = principal + interest
  }

  const feeAmt = fee ? principal * (fee / 100) : 0
  const totalPayable = total + feeAmt
  const monthlyInstallment = Math.ceil(totalPayable / months)

  const schedule = []
  let balance = totalPayable
  const now = new Date()
  for (let i = 1; i <= months; i++) {
    const dd = new Date(now.getFullYear(), now.getMonth() + i, now.getDate())
    const isLast = i === months
    const amt = isLast ? balance : monthlyInstallment
    balance = Math.max(0, balance - amt)
    schedule.push({
      installmentNumber: i, dueDate: dd.toISOString().split('T')[0],
      principal: Math.round(principal / months), interest: Math.round(interest / months),
      totalAmount: amt, remainingBalance: balance,
    })
  }

  return { interestAmount: interest, totalAmount: total, totalPayable, monthlyInstallment, feeAmount: feeAmt, schedule }
}

export default function MemberLoans() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [loans, setLoans] = useState<Loan[]>([])
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [tab, setTab] = useState<'overview' | 'apply'>('overview')
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [schedule, setSchedule] = useState<LoanSchedule[]>([])
  const [repayments, setRepayments] = useState<LoanRepayment[]>([])
  const [penalties, setPenalties] = useState<LoanPenalty[]>([])

  // Application form
  const [selProduct, setSelProduct] = useState('')
  const [amount, setAmount] = useState(300000)
  const [duration, setDuration] = useState(3)
  const [purpose, setPurpose] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'member') { router.push('/auth/login'); return }
    setUser(session)
    loadData()
  }, [])

  const loadData = () => {
    const memberId = getMemberId() || ''
    const allLoans = DB.get<Loan[]>('loans') || []
    setLoans(allLoans.filter(l => l.memberId === memberId))
    setProducts(DB.get<LoanProduct[]>('loanProducts') || [])
  }

  const product = products.find(p => p.id === selProduct)
  const calc = product ? calculateLoan(amount, product.interestRate, duration, product.interestMethod, product.processingFee || 0) : null

  const submitApplication = () => {
    if (!product || !calc) return
    const memberId = getMemberId() || ''
    const session = getSession()
    const loanNo = `LN-${Date.now().toString(36).toUpperCase()}`
    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      memberId,
      memberNo: session?.memberNo || '',
      memberName: session?.name || '',
      loanNo,
      loanType: product.name,
      principal: amount,
      interestRate: product.interestRate,
      interestMethod: product.interestMethod,
      totalInterest: calc.interestAmount,
      totalAmount: calc.totalAmount,
      processingFee: product.processingFee || 0,
      totalPayable: calc.totalPayable,
      amountPaid: 0,
      balance: calc.totalPayable,
      repaymentPeriod: duration,
      repaymentFreq: 'MONTHLY',
      durationMonths: duration,
      status: 'pending',
      applicationId: '',
      createdAt: new Date().toISOString(),
      product,
    }
    const all = DB.get<Loan[]>('loans') || []
    DB.set('loans', [...all, newLoan])
    setSubmitted(true)
    setTimeout(() => { setTab('overview'); setSubmitted(false); loadData() }, 2000)
  }

  const statusColors: Record<string, string> = {
    pending: 'badge-yellow', active: 'badge-blue', repaid: 'badge-green',
    defaulted: 'badge-red', rejected: 'badge-red', written_off: 'badge-red', overdue: 'badge-red', approved: 'badge-blue',
  }

  const viewDetails = (loan: Loan) => {
    setSelectedLoan(loan)
    const allSchedules = DB.get<LoanSchedule[]>('loanSchedules') || []
    const allRepayments = DB.get<LoanRepayment[]>('repayments') || []
    const allPenalties = DB.get<LoanPenalty[]>('penalties') || []
    setSchedule(allSchedules.filter(s => s.loanId === loan.id))
    setRepayments(allRepayments.filter(r => r.loanId === loan.id))
    setPenalties(allPenalties.filter(p => p.loanId === loan.id))
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8F5E9]">My Loans</h1>
          <p className="text-sm text-[#8DA88D]">{loans.filter(l => l.status === 'active' || l.status === 'overdue').length} active loan(s)</p>
        </div>
        <button onClick={() => { setTab('apply'); setSubmitted(false) }} className="px-4 py-2 bg-[#B6E62E] text-[#0A1404] rounded-lg text-sm font-medium hover:bg-[#9CCC2A] transition">Apply for Loan</button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('overview')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'overview' ? 'bg-[#B6E62E] text-[#0A1404]' : 'bg-[#1E2D12] text-[#8DA88D]'}`}>My Loans</button>
        <button onClick={() => setTab('apply')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'apply' ? 'bg-[#B6E62E] text-[#0A1404]' : 'bg-[#1E2D12] text-[#8DA88D]'}`}>Apply</button>
      </div>

      {tab === 'apply' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass p-6 glow space-y-4">
            <h2 className="text-lg font-semibold text-[#E8F5E9]">Loan Application</h2>

            {submitted ? (
              <div className="bg-[#B6E62E]/10 border border-[#B6E62E] rounded-lg p-4 text-center">
                <p className="text-[#B6E62E] font-medium">Application Submitted Successfully!</p>
                <p className="text-[#8DA88D] text-sm mt-1">Your application is pending review.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-[#8DA88D] block mb-1">Loan Product</label>
                  <select value={selProduct} onChange={e => setSelProduct(e.target.value)} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]">
                    <option value="">Select a product...</option>
                    {products.filter(p => p.isActive).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.interestRate}% - Up to {p.maxAmount?.toLocaleString()} UGX)</option>
                    ))}
                  </select>
                </div>

                {product && (
                  <>
                    <div>
                      <label className="text-xs text-[#8DA88D] block mb-1">Requested Amount (UGX)</label>
                      <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} min={product.minAmount} max={product.maxAmount} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
                      <p className="text-xs text-[#8DA88D] mt-1">Min: {product.minAmount.toLocaleString()} | Max: {product.maxAmount?.toLocaleString()}</p>
                    </div>

                    <div>
                      <label className="text-xs text-[#8DA88D] block mb-1">Repayment Period (Months)</label>
                      <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={1} max={product.repaymentPeriod} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
                      <p className="text-xs text-[#8DA88D] mt-1">Max: {product.repaymentPeriod} months</p>
                    </div>

                    <div>
                      <label className="text-xs text-[#8DA88D] block mb-1">Purpose (Optional)</label>
                      <textarea value={purpose} onChange={e => setPurpose(e.target.value)} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" rows={2} placeholder="Brief description of loan purpose" />
                    </div>

                    <button onClick={submitApplication} disabled={!amount || amount < (product.minAmount || 0)} className="w-full py-3 bg-[#B6E62E] text-[#0A1404] rounded-lg text-sm font-medium hover:bg-[#9CCC2A] transition disabled:opacity-50">
                      Submit Application
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {product && calc && (
            <div className="glass p-6 glow space-y-4">
              <h2 className="text-lg font-semibold text-[#E8F5E9]">Loan Summary</h2>
              <p className="text-xs text-[#8DA88D]">Review your financial obligation before submission</p>

              <div className="space-y-3 bg-[#1E2D12] rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#8DA88D]">Requested Loan</span>
                  <span className="text-sm font-mono text-[#E8F5E9]">UGX {amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#8DA88D]">Interest Rate</span>
                  <span className="text-sm font-mono text-[#FBBF24]">{product.interestRate}% ({product.interestMethod})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#8DA88D]">Interest Amount</span>
                  <span className="text-sm font-mono text-[#F87171]">UGX {calc.interestAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#8DA88D]">Processing Fee ({product.processingFee || 0}%)</span>
                  <span className="text-sm font-mono text-[#F87171]">UGX {calc.feeAmount.toLocaleString()}</span>
                </div>
                <hr className="border-[#2A3D18]" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-[#E8F5E9]">Total Repayment</span>
                  <span className="text-lg font-bold font-mono text-[#B6E62E]">UGX {calc.totalPayable.toLocaleString()}</span>
                </div>
                <hr className="border-[#2A3D18]" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#8DA88D]">Repayment Period</span>
                  <span className="text-sm font-mono text-[#E8F5E9]">{duration} Months</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#8DA88D]">Monthly Installment</span>
                  <span className="text-lg font-bold font-mono text-[#60A5FA]">UGX {calc.monthlyInstallment.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[#E8F5E9] mb-2">Repayment Schedule</h3>
                <div className="space-y-1">
                  {calc.schedule.map(s => (
                    <div key={s.installmentNumber} className="flex justify-between items-center bg-[#1E2D12] px-3 py-2 rounded-lg">
                      <span className="text-xs text-[#8DA88D]">Month {s.installmentNumber}</span>
                      <span className="text-xs text-[#E8F5E9] font-mono">Due: {s.dueDate}</span>
                      <span className="text-xs font-mono text-[#B6E62E]">UGX {s.totalAmount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-[#8DA88D] italic">By submitting, you agree to repay the full amount as per the schedule above.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'overview' && !selectedLoan && (
        <>
          {loans.length === 0 ? (
            <div className="glass p-8 text-center glow">
              <p className="text-[#8DA88D]">You have no loans yet.</p>
              <button onClick={() => setTab('apply')} className="mt-4 px-6 py-2 bg-[#B6E62E] text-[#0A1404] rounded-lg text-sm font-medium">Apply for a Loan</button>
            </div>
          ) : (
            <div className="glass overflow-hidden glow">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2A3D18]">
                      <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Loan No</th>
                      <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Type</th>
                      <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Amount</th>
                      <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Interest</th>
                      <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Paid</th>
                      <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Balance</th>
                      <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Rate</th>
                      <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map(l => (
                      <tr key={l.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                        <td className="px-4 py-3 text-sm text-[#B6E62E]">{l.loanNo}</td>
                        <td className="px-4 py-3 text-sm text-[#8DA88D]">{l.loanType}</td>
                        <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{l.principal?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-[#F87171] text-right font-mono">{l.totalInterest?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-3 text-sm text-[#B6E62E] text-right font-mono">{l.amountPaid?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-3 text-sm text-[#FBBF24] text-right font-mono">{l.balance?.toLocaleString() || l.principal?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{l.interestRate}%</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${statusColors[l.status] || 'badge-yellow'}`}>{l.status}</span></td>
                        <td className="px-4 py-3">
                          <button onClick={() => viewDetails(l)} className="text-xs bg-[#1E2D12] text-[#60A5FA] px-3 py-1 rounded-lg hover:bg-[#2A3D18] transition">Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {selectedLoan && (
        <div className="space-y-6">
          <button onClick={() => setSelectedLoan(null)} className="text-sm text-[#60A5FA] hover:underline">&larr; Back to Loans</button>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass p-4 glow">
              <p className="text-[#8DA88D] text-xs uppercase">Loan Amount</p>
              <p className="text-2xl font-bold text-[#B6E62E] mt-1">UGX {selectedLoan.principal?.toLocaleString()}</p>
            </div>
            <div className="glass p-4 glow">
              <p className="text-[#8DA88D] text-xs uppercase">Interest</p>
              <p className="text-2xl font-bold text-[#F87171] mt-1">UGX {selectedLoan.totalInterest?.toLocaleString()}</p>
              <p className="text-xs text-[#8DA88D]">Rate: {selectedLoan.interestRate}%</p>
            </div>
            <div className="glass p-4 glow">
              <p className="text-[#8DA88D] text-xs uppercase">Processing Fee</p>
              <p className="text-2xl font-bold text-[#FBBF24] mt-1">UGX {selectedLoan.processingFee ? Math.round(selectedLoan.principal * (selectedLoan.processingFee / 100)).toLocaleString() : '0'}</p>
            </div>
            <div className="glass p-4 glow">
              <p className="text-[#8DA88D] text-xs uppercase">Total Payable</p>
              <p className="text-2xl font-bold text-[#E8F5E9] mt-1">UGX {selectedLoan.totalPayable?.toLocaleString() || selectedLoan.totalAmount?.toLocaleString()}</p>
            </div>
            <div className="glass p-4 glow">
              <p className="text-[#8DA88D] text-xs uppercase">Amount Paid</p>
              <p className="text-2xl font-bold text-[#60A5FA] mt-1">UGX {selectedLoan.amountPaid?.toLocaleString() || '0'}</p>
            </div>
            <div className="glass p-4 glow">
              <p className="text-[#8DA88D] text-xs uppercase">Outstanding Balance</p>
              <p className="text-2xl font-bold text-[#F87171] mt-1">UGX {(selectedLoan.balance || selectedLoan.totalPayable || selectedLoan.totalAmount)?.toLocaleString()}</p>
            </div>
          </div>

          {selectedLoan.status === 'active' && (
            <div className="glass p-4 glow">
              <h3 className="text-sm font-medium text-[#E8F5E9] mb-3">Repayment Progress</h3>
              <div className="w-full bg-[#1E2D12] rounded-full h-4">
                <div className="bg-[#B6E62E] h-4 rounded-full transition-all" style={{ width: `${selectedLoan.progress || (selectedLoan.totalAmount > 0 ? Math.round((selectedLoan.amountPaid / selectedLoan.totalAmount) * 100) : 0)}%` }} />
              </div>
              <p className="text-xs text-[#8DA88D] mt-1 text-right">{selectedLoan.progress || (selectedLoan.totalAmount > 0 ? Math.round((selectedLoan.amountPaid / selectedLoan.totalAmount) * 100) : 0)}% paid</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {schedule.length > 0 && (
              <div className="glass p-4 glow">
                <h3 className="text-sm font-medium text-[#E8F5E9] mb-3">Repayment Schedule</h3>
                <div className="space-y-1">
                  {schedule.map(s => (
                    <div key={s.id} className="flex justify-between items-center bg-[#1E2D12] px-3 py-2 rounded-lg">
                      <span className="text-xs text-[#8DA88D]">#{s.installment}</span>
                      <span className="text-xs text-[#8DA88D]">{new Date(s.dueDate).toLocaleDateString()}</span>
                      <span className="text-xs font-mono text-[#E8F5E9]">UGX {s.totalAmount.toLocaleString()}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'PAID' ? 'bg-green-500/20 text-green-400' : s.status === 'OVERDUE' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {repayments.length > 0 && (
              <div className="glass p-4 glow">
                <h3 className="text-sm font-medium text-[#E8F5E9] mb-3">Payment History</h3>
                <div className="space-y-1">
                  {repayments.map(r => (
                    <div key={r.id} className="flex justify-between items-center bg-[#1E2D12] px-3 py-2 rounded-lg">
                      <span className="text-xs text-[#8DA88D]">{new Date(r.paidAt).toLocaleDateString()}</span>
                      <span className="text-xs font-mono text-[#B6E62E]">UGX {r.amount.toLocaleString()}</span>
                      <span className="text-xs text-[#8DA88D]">P:{r.principalPortion} I:{r.interestPortion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {penalties.length > 0 && (
              <div className="glass p-4 glow">
                <h3 className="text-sm font-medium text-[#F87171] mb-3">Penalties</h3>
                <div className="space-y-1">
                  {penalties.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-[#1E2D12] px-3 py-2 rounded-lg">
                      <span className="text-xs text-[#8DA88D]">{p.reason}</span>
                      <span className="text-xs font-mono text-[#F87171]">UGX {p.amount.toLocaleString()}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.waivedAt ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{p.waivedAt ? 'Waived' : 'Active'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(selectedLoan.status === 'active' || selectedLoan.status === 'overdue') && (
            <div className="glass p-4 glow">
              <h3 className="text-sm font-medium text-[#E8F5E9] mb-3">Make a Payment</h3>
              <RepaymentForm loanId={selectedLoan.id} onSuccess={() => { setSelectedLoan(null); loadData() }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RepaymentForm({ loanId, onSuccess }: { loanId: string; onSuccess: () => void }) {
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState('cash')

  const handleRepay = () => {
    if (amount <= 0) return
    const allRepayments = DB.get<LoanRepayment[]>('repayments') || []
    const allLoans = DB.get<Loan[]>('loans') || []
    const loan = allLoans.find(l => l.id === loanId)
    if (!loan) return

    const repayment: LoanRepayment = {
      id: `rep-${Date.now()}`,
      loanId,
      memberId: loan.memberId,
      amount,
      principalPortion: Math.round(amount * 0.95),
      interestPortion: Math.round(amount * 0.05),
      penaltyPortion: 0,
      paymentMethod: method as any,
      reference: `REF-${Date.now()}`,
      paidAt: new Date().toISOString(),
    }

    const updated = allLoans.map(l => {
      if (l.id === loanId) {
        const newPaid = (l.amountPaid || 0) + amount
        const newBalance = Math.max(0, (l.totalPayable || l.totalAmount || 0) - newPaid)
        return { ...l, amountPaid: newPaid, balance: newBalance, status: newBalance <= 0 ? 'repaid' as const : l.status, paidAt: newBalance <= 0 ? new Date().toISOString() : l.paidAt }
      }
      return l
    })

    DB.set('repayments', [...allRepayments, repayment])
    DB.set('loans', updated)
    onSuccess()
  }

  return (
    <div className="flex gap-3 items-end">
      <div className="flex-1">
        <label className="text-xs text-[#8DA88D] block mb-1">Amount (UGX)</label>
        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} min={0} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" placeholder="Enter amount" />
      </div>
      <div>
        <label className="text-xs text-[#8DA88D] block mb-1">Method</label>
        <select value={method} onChange={e => setMethod(e.target.value)} className="bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]">
          <option value="cash">Cash</option>
          <option value="bank">Bank Transfer</option>
          <option value="mtn">Mobile Money</option>
        </select>
      </div>
      <button onClick={handleRepay} disabled={amount <= 0} className="px-6 py-2 bg-[#B6E62E] text-[#0A1404] rounded-lg text-sm font-medium hover:bg-[#9CCC2A] transition disabled:opacity-50">Pay Now</button>
    </div>
  )
}
