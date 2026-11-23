import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireRole } from '@/lib/rbac'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer', 'loan_officer', 'member'])(request, async (req, session) => {
    try {
      // Verify loan exists and member has access
      const loanResult = await query(
        `SELECT l.id, l.member_id FROM loans l WHERE l.id = $1 AND l.is_deleted = false`,
        [params.id]
      )

      if (loanResult.rows.length === 0) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
      }

      const loan = loanResult.rows[0]

      if (session.role === 'member') {
        const memberResult = await query(
          `SELECT id FROM members WHERE user_id = $1 AND is_deleted = false`,
          [session.userId]
        )
        if (memberResult.rows.length === 0 || memberResult.rows[0].id !== loan.member_id) {
          return NextResponse.json({ error: 'Not authorized for this loan' }, { status: 403 })
        }
      }

      const result = await query(
        `SELECT id, installment_no, due_date, principal, interest, fees, total_due,
                paid_amount, status, paid_at
         FROM loan_schedules
         WHERE loan_id = $1 AND is_deleted = false
         ORDER BY installment_no ASC`,
        [params.id]
      )

      return NextResponse.json({ schedules: result.rows })
    } catch {
      return NextResponse.json({ error: 'Failed to fetch loan schedule' }, { status: 500 })
    }
  })
}