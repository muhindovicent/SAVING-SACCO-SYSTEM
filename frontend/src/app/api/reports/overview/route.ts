import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireRole } from '@/lib/rbac'

export async function GET(request: NextRequest): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer', 'loan_officer'])(request, async (req, session) => {
    try {
      const [memberCount, savingsCount, savingsTotal, loanCount, activeLoans, outstandingTotal, pendingApps, totalDeposits] = await Promise.all([
        query(`SELECT COUNT(*) FROM members WHERE is_deleted = false`),
        query(`SELECT COUNT(*) FROM savings_accounts WHERE is_deleted = false`),
        query(`SELECT COALESCE(SUM(balance), 0) FROM savings_accounts WHERE is_deleted = false`),
        query(`SELECT COUNT(*) FROM loans WHERE is_deleted = false`),
        query(`SELECT COUNT(*) FROM loans WHERE status = 'active' AND is_deleted = false`),
        query(`SELECT COALESCE(SUM(principal), 0) FROM loans WHERE status = 'active' AND is_deleted = false`),
        query(`SELECT COUNT(*) FROM loan_applications WHERE status = 'pending' AND is_deleted = false`),
        query(`SELECT COALESCE(SUM(amount), 0) FROM savings_transactions WHERE type = 'deposit' AND is_deleted = false`),
      ])

      return NextResponse.json({
        totalMembers: parseInt(memberCount.rows[0].count, 10),
        totalSavingsAccounts: parseInt(savingsCount.rows[0].count, 10),
        totalSavingsBalance: parseFloat(savingsTotal.rows[0].sum),
        totalLoans: parseInt(loanCount.rows[0].count, 10),
        activeLoans: parseInt(activeLoans.rows[0].count, 10),
        totalOutstanding: parseFloat(outstandingTotal.rows[0].sum),
        pendingApplications: parseInt(pendingApps.rows[0].count, 10),
        totalDeposits: parseFloat(totalDeposits.rows[0].sum),
      })
    } catch {
      return NextResponse.json({ error: 'Failed to fetch overview report' }, { status: 500 })
    }
  })
}