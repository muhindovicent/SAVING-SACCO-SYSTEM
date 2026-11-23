import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { z } from 'zod'

const loansListSchema = z.object({
  page: z.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
  limit: z.string().optional().transform((v) => v ? parseInt(v, 10) : 20),
  memberId: z.string().optional(),
  status: z.string().optional(),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer', 'loan_officer', 'member'])(request, async (req, session) => {
    try {
      const { searchParams } = new URL(request.url)
      const { page, limit, memberId, status } = loansListSchema.parse({
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
        memberId: searchParams.get('memberId') || undefined,
        status: searchParams.get('status') || undefined,
      })

      const offset = (page - 1) * limit
      let where = 'WHERE l.is_deleted = false'
      const params: unknown[] = []

      if (memberId) {
        where += ` AND l.member_id = $${params.length + 1}`
        params.push(memberId)
      }
      if (status) {
        where += ` AND l.status = $${params.length + 1}`
        params.push(status)
      }

      // Members can only see their own loans
      if (session.role === 'member') {
        const memberResult = await query(
          `SELECT id FROM members WHERE user_id = $1 AND is_deleted = false`,
          [session.userId]
        )
        if (memberResult.rows.length === 0) {
          return NextResponse.json({ error: 'Member profile not found' }, { status: 404 })
        }
        where += ` AND l.member_id = $${params.length + 1}`
        params.push(memberResult.rows[0].id)
      }

      const countResult = await query(
        `SELECT COUNT(*) FROM loans l ${where}`,
        params
      )
      const total = parseInt(countResult.rows[0].count, 10)

      const result = await query(
        `SELECT l.id, l.loan_no, l.loan_type, l.principal, l.interest_rate, l.duration_months,
                l.status, l.disbursed_at, l.created_at, l.updated_at,
                m.id as member_id, m.member_no, m.first_name, m.last_name
         FROM loans l
         JOIN members m ON l.member_id = m.id
         ${where}
         ORDER BY l.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      )

      return NextResponse.json({
        loans: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    } catch {
      return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
    }
  })
}