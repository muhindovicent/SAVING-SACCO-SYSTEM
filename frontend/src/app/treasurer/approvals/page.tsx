'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Loan, Member, LoanProduct, LoanApplication } from '@/lib/types'

function calcInterest(principal: number, rate: number, months: number, method: string, fee: number) {
  let interest = principal * (rate / 100) * (months / 12)
  if (method === 'REDUCING_BALANCE' || method === 'REDUCING') {
    const mr = rate / 100 / 12
    const p = principal * (mr * Math.pow(1 + mr, months)) / (Math.pow(1 + mr, months) - 1)
    interest = Math.ceil(p * months) - principal
  }
  const feeAmt = fee ? principal * (fee / 100) : 0
  return { interestAmount: Math.round(interest), totalAmount: principal + interest, totalPayable: principal + interest + feeAmt, monthlyInstallment: Math.ceil((principal + interest + feeAmt) / months), feeAmount: feeAmt }
}

export default function TreasurerApprovals() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [loans, setLoans] = useState<(Loan & { memberObj?: Member })[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [selectedLoan, setSelectedLoan] = useState<(Loan & { memberObj?: Member }) | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'treasurer') { router.push('/auth/login'); return }
    setUser(session)
    loadData()
  }, [])

  const loadData = () => {
    setMembers(DB.get<Member[]>('members') || [])
    setProducts(DB.get<LoanProduct[]>('loanProducts') || [])
    const allLoans = DB.get<Loan[]>('loans') || []
    const enriched = allLoans.filter(l => l.status === 'pending' || l.status === 'approved').map(l => ({
      ...l,
      memberObj: (DB.get<Member[]>('members') || []).find(m => m.id === l.memberId),
    }))
    setLoans(enriched)
  }

  const handleAction = (loanId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectReason) { alert('Please provide a reason for rejection'); return }
    const allLoans = DB.get<Loan[]>('loans') || []
    const updated = allLoans.map(l =>
      l.id === loanId
        ? { ...l, status: action === 'approve' ? ('approved' as const) : ('rejected' as const), ...(action === 'reject' ? { rejectionReason: rejectReason } : {}) }
        : l
    )
    DB.set('loans', updated)
    setSelectedLoan(null)
    setRejectReason('')
    loadData()
  }

  const handleDisburse = (loanId: string) => {
    const allLoans = DB.get<Loan[]>('loans') || []
    const loan = allLoans.find(l => l.id === loanId)
    if (!loan) return

    const product = products.find(p => p.name === loan.loanType)
    const rate = product?.interestRate || loan.interestRate || 5
    const method = product?.interestMethod || 'FLAT'
    const fee = product?.processingFee || 0
    const calc = calcInterest(loan.principal, rate, loan.durationMonths || 6, method, fee)

    // Create schedule
    const schedule = []
    const now = new Date()
    for (let i = 1; i <= (loan.durationMonths || 6); i++) {
      const dueDate = new Date(now.getFullYear(), now.getMonth() + i, now.getDate())
      schedule.push({
        id: `sch-${Date.now()}-${i}`,
        loanId,
        installment: i,
        dueDate: dueDate.toISOString(),
        principal: Math.round(loan.principal / (loan.durationMonths || 6)),
        interest: Math.round(calc.interestAmount / (loan.durationMonths || 6)),
        fees: i === 1 ? Math.round(calc.feeAmount) : 0,
        totalAmount: calc.monthlyInstallment,
        paidAmount: 0,
        balance: calc.totalPayable - (calc.monthlyInstallment * i),
        status: 'PENDING',
      })
    }
    const existingSchedules = DB.get<any[]>('loanSchedules') || []
    DB.set('loanSchedules', [...existingSchedules, ...schedule])

    const updated = allLoans.map(l =>
      l.id === loanId
        ? {
            ...l, status: 'active' as const,
            totalInterest: calc.interestAmount,
            totalAmount: calc.totalAmount,
            totalPayable: calc.totalPayable,
            amountPaid: 0,
            balance: calc.totalPayable,
            interestRate: rate,
            interestMethod: method,
            processingFee: fee,
            firstDueDate: schedule[0]?.dueDate || '',
            lastDueDate: schedule[schedule.length - 1]?.dueDate || '',
            disbursedAt: new Date().toISOString(),
          }
        : l
    )
    DB.set('loans', updated)
    setSelectedLoan(null)
    loadData()
  }

  const viewDetails = (loan: Loan & { memberObj?: Member }) => {
    setSelectedLoan(loan)
    setRejectReason('')
  }

  const selectedProduct = selectedLoan ? products.find(p => p.name === selectedLoan.loanType) : null
  const rate = selectedProduct?.interestRate || selectedLoan?.interestRate || 5
  const method = selectedProduct?.interestMethod || 'FLAT'
  const fee = selectedProduct?.processingFee || selectedLoan?.processingFee || 0
  const calc = selectedLoan ? calcInterest(selectedLoan.principal, rate, selectedLoan.durationMonths || 6, method, fee) : null

  return (
    <div className="p-4 md:p-6 space-y-6">
      {!selectedLoan ? (
        <>
          <div>
            <h1 className="text-xl font-bold text-[#E8F5E9]">Pending Approvals</h1>
            <p className="text-sm text-[#8DA88D]">{loans.length} loan applications awaiting review</p>
          </div>

          <div className="glass overflow-hidden glow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2A3D18]">
                    <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Loan No</th>
                    <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Member</th>
                    <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Type</th>
                    <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Amount</th>
                    <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Rate</th>
                    <th className="text-right px-4 py-3 text-xs text-[#8DA88D] uppercase">Term</th>
                    <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-[#8DA88D] text-sm">No pending approvals</td></tr>
                  ) : loans.map(l => (
                    <tr key={l.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                      <td className="px-4 py-3 text-sm text-[#B6E62E]">{l.loanNo}</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9]">{l.memberObj?.firstName} {l.memberObj?.lastName}</td>
                      <td className="px-4 py-3 text-sm text-[#8DA88D]">{l.loanType}</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right font-mono">{l.principal?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{l.interestRate}%</td>
                      <td className="px-4 py-3 text-sm text-[#E8F5E9] text-right">{l.durationMonths}m</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${l.status === 'pending' ? 'badge-yellow' : 'badge-blue'}`}>{l.status}</span></td>
                      <td className="px-4 py-3">
                        <button onClick={() => viewDetails(l)} className="text-xs bg-[#1E2D12] text-[#60A5FA] px-3 py-1 rounded-lg hover:bg-[#2A3D18] transition">Review</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <button onClick={() => setSelectedLoan(null)} className="text-sm text-[#60A5FA] hover:underline">&larr; Back to Approvals</button>

          <div className="glass p-6 glow">
            <h2 className="text-lg font-semibold text-[#E8F5E9] mb-4">Loan Application Review</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-[#8DA88D] uppercase">Member Details</h3>
                <div className="bg-[#1E2D12] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between"><span className="text-sm text-[#8DA88D]">Name</span><span className="text-sm text-[#E8F5E9]">{selectedLoan.memberObj?.firstName} {selectedLoan.memberObj?.lastName}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-[#8DA88D]">Member No</span><span className="text-sm text-[#B6E62E]">{selectedLoan.memberObj?.memberNo}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-[#8DA88D]">Phone</span><span className="text-sm text-[#E8F5E9]">{selectedLoan.memberObj?.phone}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-[#8DA88D]">Email</span><span className="text-sm text-[#E8F5E9]">{selectedLoan.memberObj?.email}</span></div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-[#8DA88D] uppercase">Loan Details</h3>
                <div className="bg-[#1E2D12] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between"><span className="text-sm text-[#8DA88D]">Product</span><span className="text-sm text-[#E8F5E9]">{selectedLoan.loanType}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-[#8DA88D]">Loan No</span><span className="text-sm text-[#B6E62E]">{selectedLoan.loanNo}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-[#8DA88D]">Principal</span><span className="text-sm text-[#E8F5E9] font-mono">UGX {selectedLoan.principal?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-[#8DA88D]">Interest Rate</span><span className="text-sm text-[#FBBF24] font-mono">{rate}% ({method})</span></div>
                  <div className="flex justify-between"><span className="text-sm text-[#8DA88D]">Duration</span><span className="text-sm text-[#E8F5E9]">{selectedLoan.durationMonths} months</span></div>
                </div>
              </div>
            </div>

            {calc && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-[#8DA88D] uppercase mb-3">Financial Calculation</h3>
                <div className="bg-[#1E2D12] rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-[#8DA88D]">Interest Amount</p>
                      <p className="text-lg font-bold text-[#F87171]">UGX {calc.interestAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8DA88D]">Processing Fee</p>
                      <p className="text-lg font-bold text-[#FBBF24]">UGX {calc.feeAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8DA88D]">Total Amount</p>
                      <p className="text-lg font-bold text-[#E8F5E9]">UGX {calc.totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8DA88D]">Total Repayment</p>
                      <p className="text-lg font-bold text-[#B6E62E]">UGX {calc.totalPayable.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#8DA88D]">Monthly Installment</p>
                      <p className="text-lg font-bold text-[#60A5FA]">UGX {calc.monthlyInstallment.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-xs text-[#8DA88D] uppercase mb-2">Repayment Schedule</h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {Array.from({ length: selectedLoan.durationMonths || 6 }, (_, i) => (
                        <div key={i} className="bg-[#0A1404] rounded p-2 text-center">
                          <p className="text-xs text-[#8DA88D]">Month {i + 1}</p>
                          <p className="text-sm font-mono text-[#E8F5E9]">UGX {calc.monthlyInstallment.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {selectedLoan.status === 'pending' && (
                <>
                  <button onClick={() => handleAction(selectedLoan.id, 'approve')} className="px-6 py-2 bg-[#B6E62E] text-[#0A1404] rounded-lg text-sm font-medium hover:bg-[#9CCC2A] transition">Approve</button>
                  <div className="flex-1" />
                  <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason..." className="flex-1 bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-3 py-2 text-sm text-[#E8F5E9] focus:outline-none focus:border-red-500" />
                  <button onClick={() => handleAction(selectedLoan.id, 'reject')} className="px-6 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition">Reject</button>
                </>
              )}
              {selectedLoan.status === 'approved' && (
                <button onClick={() => handleDisburse(selectedLoan.id)} className="px-6 py-2 bg-[#B6E62E] text-[#0A1404] rounded-lg text-sm font-medium hover:bg-[#9CCC2A] transition">Disburse Loan</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
