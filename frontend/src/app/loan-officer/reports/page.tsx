'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Loan, LoanProduct } from '@/lib/types'

export default function LoanOfficerReports() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [reportData, setReportData] = useState('')

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'loan_officer') { router.push('/auth/login'); return }
    setUser(session)
  }, [])

  const generateActiveLoansReport = () => {
    const loans = DB.get<Loan[]>('loans') || []
    const active = loans.filter(l => l.status === 'active' || l.status === 'overdue')
    let csv = 'LoanNo,Type,Principal,Balance,Paid,Rate,Duration,Status\n'
    active.forEach(l => {
      csv += `${l.loanNo},${l.loanType},${l.principal},${l.balance || l.totalAmount || l.principal},${l.amountPaid || 0},${l.interestRate}%,${l.durationMonths}m,${l.status}\n`
    })
    setReportData(csv)
  }

  const generateForecastReport = () => {
    const loans = DB.get<Loan[]>('loans') || []
    const products = DB.get<LoanProduct[]>('loanProducts') || []
    let csv = 'LoanNo,Type,Principal,Rate,Method,Months,ExpectedInterest,ExpectedRevenue\n'
    loans.filter(l => l.status === 'active' || l.status === 'pending').forEach(l => {
      const product = products.find(p => p.name === l.loanType)
      const rate = product?.interestRate || l.interestRate || 5
      const method = product?.interestMethod || 'FLAT'
      const months = l.durationMonths || 6
      const interest = method === 'FLAT'
        ? l.principal * (rate / 100) * (months / 12)
        : l.principal * (rate / 100 / 12) * months
      csv += `${l.loanNo},${l.loanType},${l.principal},${rate}%,${method},${months},${Math.round(interest)},${Math.round(l.principal + interest)}\n`
    })
    setReportData(csv)
  }

  const downloadCsv = () => {
    if (!reportData) return
    const blob = new Blob([reportData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loan-report-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#E8F5E9]">Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={generateActiveLoansReport} className="glass p-6 glow text-left hover:bg-[#1E2D12] transition">
          <h3 className="text-lg font-semibold text-[#E8F5E9]">Active Loans Report</h3>
          <p className="text-sm text-[#8DA88D] mt-1">Export all active and overdue loans as CSV</p>
        </button>
        <button onClick={generateForecastReport} className="glass p-6 glow text-left hover:bg-[#1E2D12] transition">
          <h3 className="text-lg font-semibold text-[#E8F5E9]">Repayment Forecast</h3>
          <p className="text-sm text-[#8DA88D] mt-1">Expected interest revenue forecast as CSV</p>
        </button>
      </div>

      {reportData && (
        <div className="glass p-6 glow space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#E8F5E9]">Generated Report</h3>
            <button onClick={downloadCsv} className="px-4 py-2 bg-[#B6E62E] text-[#0A1404] rounded-lg text-sm font-medium hover:bg-[#9CCC2A] transition">Download CSV</button>
          </div>
          <pre className="bg-[#0A1404] p-4 rounded-lg text-xs text-[#8DA88D] overflow-x-auto max-h-96">{reportData}</pre>
        </div>
      )}
    </div>
  )
}
