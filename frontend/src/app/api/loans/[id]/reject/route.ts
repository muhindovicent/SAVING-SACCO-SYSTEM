import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { z } from 'zod'

const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer', 'loan_officer'])(request, async (req, session) => {
    try {
      const body = await request.json()
      const { data, error } = (() => {
        const result = rejectSchema.safeParse(body)
        if (!result.success) {
          return { data: null as any, error: result.error.errors.map((e) => e.message).join(', ') }
        }
        return { data: result.data, error: null }
      })()

      if (error) {
        return NextResponse.json({ error }, { status: 400 })
      }

      const appResult = await query(
        `SELECT id, status FROM loan_applications WHERE id = $1 AND is_deleted = false`,
        [params.id]
      )

      if (appResult.rows.length === 0) {
        return NextResponse.json({ error: 'Loan application not found' }, { status: 404 })
      }

      if (appResult.rows[0].status !== 'pending') {
        return NextResponse.json({ error: 'Application is not pending' }, { status: 400 })
      }

      await query(
        `UPDATE loan_applications SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
        [session.userId, params.id]
      )

      await query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [session.userId, 'loan_rejected', 'loan_application', params.id,
         JSON.stringify({ reason: data.reason })]
      )

      return NextResponse.json({ message: 'Loan application rejected' })
    } catch {
      return NextResponse.json({ error: 'Failed to reject loan' }, { status: 500 })
    }
  })
}