import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireRole } from '@/lib/rbac'

export async function GET(request: NextRequest): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer', 'loan_officer'])(request, async (req, session) => {
    try {
      const result = await query(
        `SELECT l.id, l.loan_no, l.loan_type, l.principal, l.interest_rate, l.duration_months,
                l.status, l.created_at,
                m.id as member_id, m.member_no, m.first_name, m.last_name
         FROM loans l
         JOIN members m ON l.member_id = m.id
         WHERE l.status = 'active' AND l.is_deleted = false
         ORDER BY l.created_at DESC`
      )

      const totalOutstanding = result.rows.reduce(
        (sum, row) => sum + parseFloat(row.principal), 0
      )

      return NextResponse.json({
        outstandingLoans: result.rows,
        totalOutstanding,
        count: result.rows.length,
      })
    } catch {
      return NextResponse.json({ error: 'Failed to fetch outstanding loans' }, { status: 500 })
    }
  })
}