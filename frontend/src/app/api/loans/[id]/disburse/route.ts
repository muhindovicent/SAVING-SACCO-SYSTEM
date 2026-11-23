import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { requireRole } from '@/lib/rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer'])(request, async (req, session) => {
    const client = await getClient()
    try {
      await client.query('BEGIN')

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
      if (loan.status !== 'approved') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Loan is not approved for disbursement' }, { status: 400 })
      }

      const principal = parseFloat(loan.principal)

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
      const balanceAfter = balanceBefore + principal
      const reference = `DISB-${loan.loan_no}`

      // Update loan status
      await client.query(
        `UPDATE loans SET status = 'active', disbursed_at = NOW(), disbursed_by = $1, updated_at = NOW() WHERE id = $2`,
        [session.userId, params.id]
      )

      // Update savings balance
      await client.query(
        `UPDATE savings_accounts SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [balanceAfter, savings.id]
      )

      // Create savings transaction record
      await client.query(
        `INSERT INTO savings_transactions (account_id, member_id, type, amount, balance_before, balance_after, reference, description)
         VALUES ($1, $2, 'transfer_in', $3, $4, $5, $6, $7)`,
        [savings.id, loan.member_id, principal, balanceBefore, balanceAfter, reference, `Loan disbursement ${loan.loan_no}`]
      )

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [session.userId, 'loan_disbursed', 'loan', params.id,
         JSON.stringify({ loanNo: loan.loan_no, principal, memberId: loan.member_id })]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        message: 'Loan disbursed',
        loanNo: loan.loan_no,
        principal,
        newSavingsBalance: balanceAfter,
      })
    } catch {
      await client.query('ROLLBACK').catch(() => {})
      return NextResponse.json({ error: 'Failed to disburse loan' }, { status: 500 })
    } finally {
      client.release()
    }
  })
}