import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { z } from 'zod'

const depositSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  amount: z.number().positive('Amount must be positive'),
  reference: z.string().min(1, 'Reference is required').optional(),
  description: z.string().optional(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer', 'member'])(request, async (req, session) => {
    const client = await getClient()
    try {
      await client.query('BEGIN')

      const body = await request.json()
      const { data, error } = (() => {
        const result = depositSchema.safeParse(body)
        if (!result.success) {
          return { data: null as any, error: result.error.errors.map((e) => e.message).join(', ') }
        }
        return { data: result.data, error: null }
      })()

      if (error) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error }, { status: 400 })
      }

      // Members can only deposit to their own accounts
      let accountQuery = `
        SELECT sa.id, sa.member_id, sa.balance, sa.status
        FROM savings_accounts sa
        WHERE sa.id = $1 AND sa.is_deleted = false
        FOR UPDATE
      `
      const accountResult = await client.query(accountQuery, [data.accountId])

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
      const balanceAfter = balanceBefore + amount

      const reference = data.reference || `DEP-${Date.now()}`

      // Update account balance
      await client.query(
        `UPDATE savings_accounts SET balance = $1, updated_at = NOW() WHERE id = $2`,
        [balanceAfter, data.accountId]
      )

      // Insert transaction record
      const txnResult = await client.query(
        `INSERT INTO savings_transactions (account_id, member_id, type, amount, balance_before, balance_after, reference, description)
         VALUES ($1, $2, 'deposit', $3, $4, $5, $6, $7)
         RETURNING id, type, amount, balance_before, balance_after, reference, description, created_at`,
        [data.accountId, account.member_id, amount, balanceBefore, balanceAfter, reference, data.description || null]
      )

      // Record audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [session.userId, 'savings_deposit', 'savings_account', data.accountId,
         JSON.stringify({ amount, balanceBefore, balanceAfter, reference })]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        message: 'Deposit successful',
        transaction: txnResult.rows[0],
        newBalance: balanceAfter,
      }, { status: 201 })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      return NextResponse.json({ error: 'Deposit failed' }, { status: 500 })
    } finally {
      client.release()
    }
  })
}