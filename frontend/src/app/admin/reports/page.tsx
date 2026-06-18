'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Loan, Member, LoanProduct, LoanSchedule, LoanRepayment } from '@/lib/types'

export default function AdminReports() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [reportContent, setReportContent] = useState('')
  const [reportTitle, setReportTitle] = useState('')

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'admin') { router.push('/auth/login'); return }
    setUser(session)
  }, [])

  const generateReport = (type: string) => {
    const loans = DB.get<Loan[]>('loans') || []
    const members = DB.get<Member[]>('members') || []
    const products = DB.get<LoanProduct[]>('loanProducts') || []
    const schedules = DB.get<LoanSchedule[]>('loanSchedules') || []
    const repayments = DB.get<LoanRepayment[]>('repayments') || []

    let csv = ''
    setReportTitle(type.replace(/_/g, ' '))

    switch (type) {
      case 'loan_portfolio': {
        csv = 'LoanNo,Member,Product,Principal,Interest,Total,Paid,Balance,Status,DisbursedAt\n'
        loans.forEach(l => {
          const member = members.find(m => m.id === l.memberId)
          csv += `${l.loanNo},${member?.firstName} ${member?.lastName},${l.loanType},${l.principal},${l.totalInterest || 0},${l.totalPayable || l.totalAmount || l.principal},${l.amountPaid || 0},${l.balance || l.totalPayable || l.totalAmount || l.principal},${l.status},${l.disbursedAt || ''}\n`
        })
        break
      }
      case 'interest_revenue': {
        csv = 'Date,LoanNo,Member,Amount,InterestPortion,PenaltyPortion\n'
        repayments.forEach(r => {
          const loan = loans.find(l => l.id === r.loanId)
          const member = loan ? members.find(m => m.id === loan.memberId) : null
          csv += `${r.paidAt || ''},${loan?.loanNo || ''},${member?.firstName} ${member?.lastName},${r.amount},${r.interestPortion || 0},${r.penaltyPortion || 0}\n`
        })
        break
      }
      case 'outstanding_loans': {
        csv = 'LoanNo,Member,Product,Principal,Balance,Paid,Progress%,NextDueDate\n'
        const active = loans.filter(l => l.status === 'active' || l.status === 'overdue')
        active.forEach(l => {
          const member = members.find(m => m.id === l.memberId)
          const total = l.totalPayable || l.totalAmount || l.principal || 0
          const paid = l.amountPaid || 0
          const progress = total > 0 ? Math.round((paid / total) * 100) : 0
          const loanSchedules = schedules.filter(s => s.loanId === l.id && s.status !== 'PAID')
          const nextDue = loanSchedules.length > 0 ? loanSchedules[0].dueDate : ''
          csv += `${l.loanNo},${member?.firstName} ${member?.lastName},${l.loanType},${l.principal},${total - paid},${paid},${progress}%,${nextDue}\n`
        })
        break
      }
      case 'overdue_loans': {
        csv = 'LoanNo,Member,Product,Principal,Balance,DaysOverdue,Penalties\n'
        const overdue = loans.filter(l => l.status === 'overdue')
        overdue.forEach(l => {
          const member = members.find(m => m.id === l.memberId)
          const loanSchedules = schedules.filter(s => s.loanId === l.id)
          const now = new Date()
          const maxDaysOverdue = loanSchedules.length > 0
            ? Math.max(...loanSchedules.filter(s => new Date(s.dueDate) < now).map(s => Math.floor((now.getTime() - new Date(s.dueDate).getTime()) / (1000 * 60 * 60 * 24))))
            : 0
          csv += `${l.loanNo},${member?.firstName} ${member?.lastName},${l.loanType},${l.principal},${l.balance || l.totalPayable || l.totalAmount || 0},${maxDaysOverdue},0\n`
        })
        break
      }
      case 'product_performance': {
        csv = 'Product,Code,Rate,Method,TotalApps,Approved,Rejected,Disbursed,Outstanding,RepaymentRate%\n'
        products.forEach(p => {
          const productLoans = loans.filter(l => l.loanType === p.name)
          const approved = productLoans.filter(l => l.status !== 'pending' && l.status !== 'rejected').length
          const rejected = productLoans.filter(l => l.status === 'rejected').length
          const repaid = productLoans.filter(l => l.status === 'repaid').length
          csv += `${p.name},${p.code},${p.interestRate}%,${p.interestMethod},${productLoans.length},${approved},${rejected},${productLoans.reduce((s, l) => s + (l.principal || 0), 0)},${productLoans.reduce((s, l) => s + (l.balance || 0), 0)},${productLoans.length > 0 ? Math.round((repaid / productLoans.length) * 100) : 0}%\n`
        })
        break
      }
      case 'recovery': {
        csv = 'LoanNo,Member,Product,Principal,Recovered,Interest,Status,PaidAt\n'
        loans.filter(l => l.status === 'repaid').forEach(l => {
          const member = members.find(m => m.id === l.memberId)
          csv += `${l.loanNo},${member?.firstName} ${member?.lastName},${l.loanType},${l.principal},${l.amountPaid || l.totalPayable || l.totalAmount || 0},${l.totalInterest || 0},${l.status},${l.paidAt || ''}\n`
        })
        break
      }
    }

    setReportContent(csv)
  }

  const downloadCsv = () => {
    if (!reportContent) return
    const blob = new Blob([reportContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportTitle.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const reports = [
    { key: 'loan_portfolio', label: 'Loan Portfolio Report', desc: 'Complete loan portfolio with status breakdown' },
    { key: 'interest_revenue', label: 'Interest Revenue Report', desc: 'Interest and penalty revenue analysis' },
    { key: 'outstanding_loans', label: 'Outstanding Loans Report', desc: 'All active loans with balances and progress' },
    { key: 'overdue_loans', label: 'Overdue Loans Report', desc: 'Overdue loans with days overdue' },
    { key: 'product_performance', label: 'Product Performance Report', desc: 'Loan product performance metrics' },
    { key: 'recovery', label: 'Loan Recovery Report', desc: 'Recovered loans and collection rates' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#E8F5E9]">Reports</h1>
      <p className="text-sm text-[#8DA88D]">Generate and export loan reports</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r => (
          <button key={r.key} onClick={() => generateReport(r.key)} className="glass p-6 glow text-left hover:bg-[#1E2D12] transition">
            <h3 className="text-lg font-semibold text-[#E8F5E9]">{r.label}</h3>
            <p className="text-sm text-[#8DA88D] mt-1">{r.desc}</p>
            <p className="text-xs text-[#B6E62E] mt-2">Export CSV &rarr;</p>
          </button>
        ))}
      </div>

      {reportContent && (
        <div className="glass p-6 glow space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#E8F5E9]">{reportTitle}</h3>
            <div className="flex gap-2">
              <button onClick={downloadCsv} className="px-4 py-2 bg-[#B6E62E] text-[#0A1404] rounded-lg text-sm font-medium hover:bg-[#9CCC2A] transition">Download CSV</button>
              <button onClick={() => setReportContent('')} className="px-4 py-2 bg-[#1E2D12] text-[#8DA88D] rounded-lg text-sm font-medium hover:bg-[#2A3D18] transition">Clear</button>
            </div>
          </div>
          <pre className="bg-[#0A1404] p-4 rounded-lg text-xs text-[#8DA88D] overflow-x-auto max-h-96 font-mono">{reportContent}</pre>
        </div>
      )}

      <div className="glass p-6 glow">
        <h2 className="text-lg font-semibold text-[#E8F5E9] mb-4">Loan Summary</h2>
        <ReportSummary />
      </div>
    </div>
  )
}

function ReportSummary() {
  const [loans, setLoans] = useState<Loan[]>([])
  useEffect(() => { setLoans(DB.get<Loan[]>('loans') || []) }, [])
  const active = loans.filter(l => l.status === 'active')
  const overdue = loans.filter(l => l.status === 'overdue')
  const repaid = loans.filter(l => l.status === 'repaid')
  const totalOutstanding = [...active, ...overdue].reduce((s, l) => s + (l.balance || l.totalPayable || l.totalAmount || l.principal || 0), 0)
  const totalDisbursed = [...active, ...overdue, ...repaid].reduce((s, l) => s + (l.principal || 0), 0)
  const totalRecovered = [...repaid, ...active, ...overdue].reduce((s, l) => s + (l.amountPaid || 0), 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-[#1E2D12] p-4 rounded-lg">
        <p className="text-xs text-[#8DA88D]">Total Loans</p>
        <p className="text-xl font-bold text-[#E8F5E9]">{loans.length}</p>
      </div>
      <div className="bg-[#1E2D12] p-4 rounded-lg">
        <p className="text-xs text-[#8DA88D]">Total Disbursed</p>
        <p className="text-xl font-bold text-[#60A5FA]">UGX {totalDisbursed.toLocaleString()}</p>
      </div>
      <div className="bg-[#1E2D12] p-4 rounded-lg">
        <p className="text-xs text-[#8DA88D]">Total Recovered</p>
        <p className="text-xl font-bold text-[#B6E62E]">UGX {totalRecovered.toLocaleString()}</p>
      </div>
      <div className="bg-[#1E2D12] p-4 rounded-lg">
        <p className="text-xs text-[#8DA88D]">Outstanding</p>
        <p className="text-xl font-bold text-[#F87171]">UGX {totalOutstanding.toLocaleString()}</p>
      </div>
    </div>
  )
}
