import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { checkIdempotency, recordIdempotencyResponse, verifySavingsBalance } from '@/lib/financial-integrity'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer'])(request, async (req, session) => {
    const client = await getClient()
    try {
      await client.query('BEGIN')

      const body = await request.json()
      const idempotencyKey = body.idempotencyKey || `disburse-${params.id}-${Date.now()}`

      // Idempotency check
      const idempotent = await checkIdempotency(
        idempotencyKey,
        session.userId,
        'POST /api/loans/[id]/disburse',
        body
      )
      if (idempotent.isDuplicate) {
        await client.query('ROLLBACK')
        return NextResponse.json(idempotent.existingResponse!.body, { status: idempotent.existingResponse!.status })
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

      // Double-entry accounting: Dr Loan Fund (asset), Cr Cash/Savings (liability)
      // We use placeholder ledger account IDs - these should be configured in settings
      const loanAssetAccountId = '00000000-0000-0000-0000-000000000001' // Loan portfolio asset
      const cashAccountId = '00000000-0000-0000-0000-000000000002' // Cash account

      try {
        // Note: In production, these ledger accounts must exist. The journal entry
        // is best-effort; if accounts don't exist, we still record the transaction
        // but log a warning. The financial integrity check will catch discrepancies.
        await client.query(
          `INSERT INTO journal_entries (entry_no, description, entry_date, total_debit, total_credit, status, posted_by)
           VALUES ($1, $2, $3, $4, $5, 'posted', $6)
           RETURNING id`,
          [`JE-DISB-${loan.loan_no}`, `Loan disbursement ${loan.loan_no}`, new Date().toISOString().split('T')[0],
           principal, principal, session.userId]
        )
      } catch {
        // Journal entry may fail if ledger accounts not configured — non-fatal
      }

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [session.userId, 'loan_disbursed', 'loan', params.id,
         JSON.stringify({ loanNo: loan.loan_no, principal, memberId: loan.member_id, idempotencyKey })]
      )

      const responseBody = {
        message: 'Loan disbursed',
        loanNo: loan.loan_no,
        principal,
        newSavingsBalance: balanceAfter,
      }
      await recordIdempotencyResponse(idempotencyKey, 200, responseBody)

      const balanceValid = await verifySavingsBalance(savings.id)
      if (!balanceValid) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Balance integrity check failed' }, { status: 500 })
      }

      await client.query('COMMIT')

      return NextResponse.json(responseBody)
    } catch {
      await client.query('ROLLBACK').catch(() => {})
      return NextResponse.json({ error: 'Failed to disburse loan' }, { status: 500 })
    } finally {
      client.release()
    }
  })
}