import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { z } from 'zod'

const txnListSchema = z.object({
  page: z.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
  limit: z.string().optional().transform((v) => v ? parseInt(v, 10) : 20),
  accountId: z.string().optional(),
  type: z.string().optional(),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer', 'loan_officer', 'member'])(request, async (req, session) => {
    try {
      const { searchParams } = new URL(request.url)
      const { page, limit, accountId, type } = txnListSchema.parse({
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
        accountId: searchParams.get('accountId') || undefined,
        type: searchParams.get('type') || undefined,
      })

      const offset = (page - 1) * limit
      let where = 'WHERE st.is_deleted = false'
      const params: unknown[] = []

      if (accountId) {
        where += ` AND st.account_id = $${params.length + 1}`
        params.push(accountId)
      }
      if (type) {
        where += ` AND st.type = $${params.length + 1}`
        params.push(type)
      }

      // Members can only see their own transactions
      if (session.role === 'member') {
        const memberResult = await query(
          `SELECT id FROM members WHERE user_id = $1 AND is_deleted = false`,
          [session.userId]
        )
        if (memberResult.rows.length === 0) {
          return NextResponse.json({ error: 'Member profile not found' }, { status: 404 })
        }
        where += ` AND st.member_id = $${params.length + 1}`
        params.push(memberResult.rows[0].id)
      }

      const countResult = await query(
        `SELECT COUNT(*) FROM savings_transactions st ${where}`,
        params
      )
      const total = parseInt(countResult.rows[0].count, 10)

      const result = await query(
        `SELECT st.id, st.type, st.amount, st.balance_before, st.balance_after,
                st.reference, st.description, st.created_at,
                sa.account_no
         FROM savings_transactions st
         JOIN savings_accounts sa ON st.account_id = sa.id
         ${where}
         ORDER BY st.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      )

      return NextResponse.json({
        transactions: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    } catch {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }
  })
}