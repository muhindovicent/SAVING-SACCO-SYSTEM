import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { z } from 'zod'

const applySchema = z.object({
  loanType: z.string().min(1, 'Loan type is required'),
  amount: z.number().positive('Amount must be positive'),
  purpose: z.string().optional(),
  durationMonths: z.number().int().positive('Duration must be positive'),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  return requireRole(['member', 'admin', 'treasurer', 'loan_officer'])(request, async (req, session) => {
    try {
      const body = await request.json()
      const { data, error } = (() => {
        const result = applySchema.safeParse(body)
        if (!result.success) {
          return { data: null as any, error: result.error.errors.map((e) => e.message).join(', ') }
        }
        return { data: result.data, error: null }
      })()

      if (error) {
        return NextResponse.json({ error }, { status: 400 })
      }

      // Resolve member from user
      const memberResult = await query(
        `SELECT id FROM members WHERE user_id = $1 AND is_deleted = false`,
        [session.userId]
      )
      if (memberResult.rows.length === 0) {
        return NextResponse.json({ error: 'Member profile not found' }, { status: 404 })
      }
      const memberId = memberResult.rows[0].id

      // Generate application number
      const appNoResult = await query(
        `SELECT COUNT(*) FROM loan_applications`
      )
      const appCount = parseInt(appNoResult.rows[0].count, 10) + 1
      const applicationNo = `LA-${String(appCount).padStart(4, '0')}`

      const result = await query(
        `INSERT INTO loan_applications (member_id, loan_type, amount, purpose, duration_months, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING id, member_id, loan_type, amount, purpose, duration_months, status, application_no, created_at`,
        [memberId, data.loanType, data.amount, data.purpose || null, data.durationMonths]
      )

      // Update application number
      await query(
        `UPDATE loan_applications SET application_no = $1 WHERE id = $2`,
        [applicationNo, result.rows[0].id]
      )

      await query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [session.userId, 'loan_application', 'loan_application', result.rows[0].id,
         JSON.stringify({ loanType: data.loanType, amount: data.amount, durationMonths: data.durationMonths })]
      )

      return NextResponse.json({
        message: 'Loan application submitted',
        application: { ...result.rows[0], applicationNo },
      }, { status: 201 })
    } catch {
      return NextResponse.json({ error: 'Failed to submit loan application' }, { status: 500 })
    }
  })
}