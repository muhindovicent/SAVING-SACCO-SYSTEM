import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireRole } from '@/lib/rbac'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer', 'loan_officer'])(request, async (_req, session) => {
    try {
      const result = await query(
        `SELECT m.id, m.member_no, m.first_name, m.last_name, m.phone, m.email, m.id_number,
                m.date_of_birth, m.gender, m.occupation, m.employer, m.monthly_income,
                m.status, m.created_at, m.updated_at,
                u.id as user_id, u.email as user_email, u.role as user_role, u.is_active
         FROM members m
         LEFT JOIN users u ON m.user_id = u.id
         WHERE m.id = $1 AND m.is_deleted = false`,
        [params.id]
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 })
      }

      return NextResponse.json({ member: result.rows[0] })
    } catch {
      return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 })
    }
  })
}