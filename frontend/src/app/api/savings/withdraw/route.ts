import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { z } from 'zod'
import { checkIdempotency, recordIdempotencyResponse, verifySavingsBalance } from '@/lib/financial-integrity'

const withdrawSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  amount: z.number().positive('Amount must be positive'),
  reference: z.string().min(1, 'Reference is required').optional(),
  description: z.string().optional(),
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer', 'member'])(request, async (req, session) => {
    const client = await getClient()
    try {
      await client.query('BEGIN')

      const body = await request.json()
      const { data, error } = (() => {
        const result = withdrawSchema.safeParse(body)
        if (!result.success) {
          return { data: null as any, error: result.error.errors.map((e) => e.message).join(', ') }
        }
        return { data: result.data, error: null }
      })()

      if (error) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error }, { status: 400 })
      }

      // Idempotency check
      const idempotent = await checkIdempotency(
        data.idempotencyKey,
        session.userId,
        'POST /api/savings/withdraw',
        body
      )
      if (idempotent.isDuplicate) {
        await client.query('ROLLBACK')
        return NextResponse.json(idempotent.existingResponse!.body, { status: idempotent.existingResponse!.status })
      }

      const accountResult = await client.query(
        `SELECT sa.id, sa.member_id, sa.balance, sa.status
         FROM savings_accounts sa
         WHERE sa.id = $1 AND sa.is_deleted = false
         FOR UPDATE`,
        [data.accountId]
      )

      if (accountResult.rows.length === 0) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Savings account not found' }, { status: 404 })
      }

      const account = accountResult.rows[0]

      if (session.role === 'member') {
        const memberResult = await client.query(
          `SELECT id FROM members WHERE user_id = $1 AND is_deleted = false`,
          [session.userId]
        )
        if (memberResult.rows.length === 0 || memberResult.rows[0].id !== account.member_id) {
          await client.query('ROLLBACK')
          return NextResponse.json({ error: 'Not authorized for this account' }, { status: 403 })
        }
      }

      if (account.status !== 'active') {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Account is not active' }, { status: 400 })
      }

      const balanceBefore = parseFloat(account.balance)
      const amount = data.amount

      if (balanceBefore < amount) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
      }

      const balanceAfter = balanceBefore - amount
      const reference = data.reference || `WTH-${Date.now()}`

      await client.query(
        `UPDATE savings_accounts SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [balanceAfter, data.accountId]
      )

      const txnResult = await client.query(
        `INSERT INTO savings_transactions (account_id, member_id, type, amount, balance_before, balance_after, reference, description)
         VALUES ($1, $2, 'withdrawal', $3, $4, $5, $6, $7)
         RETURNING id, type, amount, balance_before, balance_after, reference, description, created_at`,
        [data.accountId, account.member_id, amount, balanceBefore, balanceAfter, reference, data.description || null]
      )

      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [session.userId, 'savings_withdrawal', 'savings_account', data.accountId,
         JSON.stringify({ amount, balanceBefore, balanceAfter, reference, idempotencyKey: data.idempotencyKey })]
      )

      const responseBody = {
        message: 'Withdrawal successful',
        transaction: txnResult.rows[0],
        newBalance: balanceAfter,
      }
      await recordIdempotencyResponse(data.idempotencyKey, 201, responseBody)

      const balanceValid = await verifySavingsBalance(data.accountId)
      if (!balanceValid) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Balance integrity check failed' }, { status: 500 })
      }

      await client.query('COMMIT')

      return NextResponse.json(responseBody, { status: 201 })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      return NextResponse.json({ error: 'Withdrawal failed' }, { status: 500 })
    } finally {
      client.release()
    }
  })
}