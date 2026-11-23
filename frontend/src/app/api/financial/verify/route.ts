import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { verifySavingsBalance, recalculateLoanBalance } from '@/lib/financial-integrity'

export async function GET(request: NextRequest): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer'])(request, async (req, session) => {
    try {
      const { searchParams } = new URL(request.url)
      const accountId = searchParams.get('accountId')
      const loanId = searchParams.get('loanId')

      const results: any = {
        verifiedAt: new Date().toISOString(),
        checks: [],
      }

      if (accountId) {
        const isValid = await verifySavingsBalance(accountId)
        const accountResult = await query(
          `SELECT id, account_no, balance FROM savings_accounts WHERE id = $1 AND is_deleted = false`,
          [accountId]
        )

        if (accountResult.rows.length === 0) {
          return NextResponse.json({ error: 'Savings account not found' }, { status: 404 })
        }

        const calcResult = await query(
          `SELECT
             COALESCE(SUM(CASE WHEN type IN ('deposit', 'interest', 'transfer_in') THEN amount ELSE 0 END), 0) as total_in,
             COALESCE(SUM(CASE WHEN type IN ('withdrawal', 'fee', 'transfer_out') THEN amount ELSE 0 END), 0) as total_out
           FROM savings_transactions
           WHERE account_id = $1 AND is_deleted = false`,
          [accountId]
        )

        const totalIn = parseFloat(calcResult.rows[0].total_in || 0)
        const totalOut = parseFloat(calcResult.rows[0].total_out || 0)
        const calculated = totalIn - totalOut

        results.checks.push({
          type: 'savings_balance',
          accountId,
          accountNo: accountResult.rows[0].account_no,
          storedBalance: parseFloat(accountResult.rows[0].balance),
          calculatedBalance: calculated,
          valid: isValid,
        })
      }

      if (loanId) {
        const loanBalance = await recalculateLoanBalance(loanId)
        const loanResult = await query(
          `SELECT id, loan_no, principal, status FROM loans WHERE id = $1 AND is_deleted = false`,
          [loanId]
        )

        if (loanResult.rows.length === 0) {
          return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
        }

        results.checks.push({
          type: 'loan_balance',
          loanId,
          loanNo: loanResult.rows[0].loan_no,
          storedPrincipal: parseFloat(loanResult.rows[0].principal),
          totalPaid: loanBalance.totalPaid,
          calculatedOutstanding: loanBalance.outstanding,
          status: loanResult.rows[0].status,
        })
      }

      if (!accountId && !loanId) {
        const allAccounts = await query(
          `SELECT id FROM savings_accounts WHERE is_deleted = false LIMIT 100`
        )
        const accountChecks = await Promise.all(
          allAccounts.rows.map((row) => verifySavingsBalance(row.id))
        )
        const invalidAccounts = accountChecks.filter((v) => !v).length

        results.checks.push({
          type: 'bulk_savings_verification',
          totalChecked: allAccounts.rows.length,
          invalidCount: invalidAccounts,
          allValid: invalidAccounts === 0,
        })
      }

      const allValid = results.checks.every((c: any) => c.valid !== false && c.allValid !== false)
      results.allValid = allValid

      return NextResponse.json(results)
    } catch {
      return NextResponse.json({ error: 'Financial integrity check failed' }, { status: 500 })
    }
  })
}