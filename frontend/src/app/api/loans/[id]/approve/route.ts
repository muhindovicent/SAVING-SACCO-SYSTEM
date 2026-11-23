import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { z } from 'zod'

const approveSchema = z.object({
  interestRate: z.number().min(0, 'Interest rate must be non-negative').optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer', 'loan_officer'])(request, async (req, session) => {
    const client = await getClient()
    try {
      await client.query('BEGIN')

      const body = await request.json()
      const { interestRate } = approveSchema.parse(body)

      // Get the application
      const appResult = await client.query(
        `SELECT la.id, la.member_id, la.amount, la.duration_months, la.status,
                m.user_id
         FROM loan_applications la
         JOIN members m ON la.member_id = m.id
         WHERE la.id = $1 AND la.is_deleted = false
         FOR UPDATE`,
        [params.id]
      )

      if (appResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Loan application not found' }, { status: 404 })
      }

      const app = appResult.rows[0]
      if (app.status !== 'pending') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Application is not pending' }, { status: 400 })
      }

      const rate = interestRate ?? 12
      const principal = parseFloat(app.amount)
      const duration = app.duration_months

      // Flat interest calculation
      const totalInterest = principal * (rate / 100) * (duration / 12)
      const totalAmount = principal + totalInterest
      const monthlyInstallment = totalAmount / duration

      // Generate loan number
      const loanNoResult = await client.query(`SELECT COUNT(*) FROM loans`)
      const loanCount = parseInt(loanNoResult.rows[0].count, 10) + 1
      const loanNo = `LN-${String(loanCount).padStart(4, '0')}`

      // Create the loan record
      const loanResult = await client.query(
        `INSERT INTO loans (member_id, loan_no, loan_type, principal, interest_rate, duration_months, status, approved_by, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7, NOW())
         RETURNING id, loan_no, principal, interest_rate, duration_months, status`,
        [app.member_id, loanNo, 'Loan', principal, rate, duration, session.userId]
      )
      const loanId = loanResult.rows[0].id

      // Create repayment schedules
      const startDate = new Date()
      for (let i = 1; i <= duration; i++) {
        const dueDate = new Date(startDate)
        dueDate.setMonth(dueDate.getMonth() + i)
        await client.query(
          `INSERT INTO loan_schedules (loan_id, installment_no, due_date, principal, interest, fees, total_due, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
          [loanId, i, dueDate.toISOString().split('T')[0],
           principal / duration, totalInterest / duration, 0, monthlyInstallment]
        )
      }

      // Update application status
      await client.query(
        `UPDATE loan_applications SET status = 'approved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2`,
        [session.userId, params.id]
      )

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [session.userId, 'loan_approved', 'loan', loanId,
         JSON.stringify({ loanNo, principal, rate, duration, totalInterest, totalAmount })]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        message: 'Loan approved',
        loan: loanResult.rows[0],
        totalInterest,
        totalAmount,
        monthlyInstallment,
      })
    } catch {
      await client.query('ROLLBACK').catch(() => {})
      return NextResponse.json({ error: 'Failed to approve loan' }, { status: 500 })
    } finally {
      client.release()
    }
  })
}