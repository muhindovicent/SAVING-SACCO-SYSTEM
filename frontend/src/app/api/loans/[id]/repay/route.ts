import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { z } from 'zod'

const repaySchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer', 'member'])(request, async (req, session) => {
    const client = await getClient()
    try {
      await client.query('BEGIN')

      const body = await request.json()
      const { data, error } = (() => {
        const result = repaySchema.safeParse(body)
        if (!result.success) {
          return { data: null as any, error: result.error.errors.map((e) => e.message).join(', ') }
        }
        return { data: result.data, error: null }
      })()

      if (error) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error }, { status: 400 })
      }

      // Get the loan
      const loanResult = await client.query(
        `SELECT l.id, l.member_id, l.principal, l.status, l.loan_no, m.user_id
         FROM loans l
         JOIN members m ON l.member_id = m.id
         WHERE l.id = $1 AND l.is_deleted = false
         FOR UPDATE`,
        [params.id]
      )

      if (loanResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
      }

      const loan = loanResult.rows[0]
      if (loan.status !== 'active') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Loan is not active' }, { status: 400 })
      }

      // Members can only repay their own loans
      if (session.role === 'member') {
        const memberResult = await client.query(
          `SELECT id FROM members WHERE user_id = $1 AND is_deleted = false`,
          [session.userId]
        )
        if (memberResult.rows.length === 0 || memberResult.rows[0].id !== loan.member_id) {
          await client.query('ROLLBACK')
          return NextResponse.json({ error: 'Not authorized for this loan' }, { status: 403 })
        }
      }

      const amount = data.amount

      // Get member's active savings account
      const savingsResult = await client.query(
        `SELECT id, balance FROM savings_accounts WHERE member_id = $1 AND status = 'active' AND is_deleted = false LIMIT 1 FOR UPDATE`,
        [loan.member_id]
      )

      if (savingsResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Member has no active savings account' }, { status: 400 })
      }

      const savings = savingsResult.rows[0]
      const balanceBefore = parseFloat(savings.balance)

      if (balanceBefore < amount) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Insufficient funds in savings account' }, { status: 400 })
      }

      const balanceAfter = balanceBefore - amount

      // Update savings balance
      await client.query(
        `UPDATE savings_accounts SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [balanceAfter, savings.id]
      )

      // Create savings transaction (withdrawal for repayment)
      await client.query(
        `INSERT INTO savings_transactions (account_id, member_id, type, amount, balance_before, balance_after, reference, description)
         VALUES ($1, $2, 'transfer_out', $3, $4, $5, $6, $7)`,
        [savings.id, loan.member_id, amount, balanceBefore, balanceAfter, data.reference || `REPAY-${loan.loan_no}`, `Loan repayment ${loan.loan_no}`]
      )

      // Get the next unpaid schedule
      const scheduleResult = await client.query(
        `SELECT id, installment_no, total_due, paid_amount FROM loan_schedules
         WHERE loan_id = $1 AND status != 'paid' AND is_deleted = false
         ORDER BY installment_no ASC LIMIT 1 FOR UPDATE`,
        [params.id]
      )

      let principalPart = amount
      let interestPart = 0
      let feesPart = 0

      if (scheduleResult.rows.length > 0) {
        const schedule = scheduleResult.rows[0]
        const remainingDue = parseFloat(schedule.total_due) - parseFloat(schedule.paid_amount)

        if (amount >= remainingDue) {
          // Pay off this installment fully
          await client.query(
            `UPDATE loan_schedules SET paid_amount = total_due, status = 'paid', paid_at = NOW() WHERE id = $1`,
            [schedule.id]
          )
          principalPart = parseFloat(schedule.total_due) * 0.6 // simplified split
          interestPart = parseFloat(schedule.total_due) * 0.4
        } else {
          // Partial payment
          await client.query(
            `UPDATE loan_schedules SET paid_amount = paid_amount + $1 WHERE id = $2`,
            [amount, schedule.id]
          )
          principalPart = amount * 0.6
          interestPart = amount * 0.4
        }
      }

      // Create loan repayment record
      await client.query(
        `INSERT INTO loan_repayments (loan_id, schedule_id, member_id, amount, principal_part, interest_part, fees_part, method, reference, receipt_no)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [params.id, scheduleResult.rows.length > 0 ? scheduleResult.rows[0].id : null,
         loan.member_id, amount, principalPart, interestPart, feesPart,
         data.paymentMethod || 'cash', data.reference || `REPAY-${Date.now()}`, `RCP-${Date.now()}`]
      )

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [session.userId, 'loan_repayment', 'loan', params.id,
         JSON.stringify({ amount, loanNo: loan.loan_no, paymentMethod: data.paymentMethod })]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        message: 'Repayment successful',
        amount,
        newSavingsBalance: balanceAfter,
      })
    } catch {
      await client.query('ROLLBACK').catch(() => {})
      return NextResponse.json({ error: 'Repayment failed' }, { status: 500 })
    } finally {
      client.release()
    }
  })
}