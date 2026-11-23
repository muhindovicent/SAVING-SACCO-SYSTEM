import { query, getClient } from '@/lib/db'

export interface IdempotencyResult {
  isDuplicate: boolean
  existingResponse: { status: number; body: any } | null
}

/**
 * Checks if an idempotency key has already been processed.
 * If found, returns the cached response so the client gets the same result.
 * If not found, returns null so the caller can proceed.
 */
export async function checkIdempotency(
  key: string,
  userId: string | null,
  endpoint: string,
  requestBody: unknown
): Promise<IdempotencyResult> {
  // Hash the request body to detect identical retries with the same key
  const encoder = new TextEncoder()
  const bodyStr = JSON.stringify(requestBody)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(bodyStr))
  const requestHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const result = await query(
    `SELECT id, key, response_status, response_body, expires_at
     FROM idempotency_keys
     WHERE key = $1 AND expires_at > NOW()`,
    [key]
  )

  if (result.rows.length > 0) {
    const row = result.rows[0]
    return {
      isDuplicate: true,
      existingResponse: {
        status: row.response_status,
        body: row.response_body,
      },
    }
  }

  // Record the key as in-progress (we'll update the response after processing)
  await query(
    `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, response_status, response_body)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [key, userId, endpoint, requestHash, null, null]
  )

  return { isDuplicate: false, existingResponse: null }
}

/**
 * Records the final response for an idempotency key after successful processing.
 */
export async function recordIdempotencyResponse(
  key: string,
  status: number,
  body: unknown
): Promise<void> {
  await query(
    `UPDATE idempotency_keys
     SET response_status = $1, response_body = $2
     WHERE key = $3`,
    [status, JSON.stringify(body), key]
  )
}

/**
 * Creates balanced double-entry journal entries for a financial transaction.
 * Uses database transaction to ensure atomicity.
 */
export async function createJournalEntry({
  description,
  entryDate,
  lines, // [{ accountId, debit, credit, description }]
  postedBy,
}: {
  description: string
  entryDate: Date
  lines: { accountId: string; debit: number; credit: number; description?: string }[]
  postedBy: string
}) {
  const client = await getClient()
  try {
    await client.query('BEGIN')

    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0)
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0)

    if (totalDebit !== totalCredit) {
      await client.query('ROLLBACK')
      throw new Error(`Journal entry not balanced: debit=${totalDebit} credit=${totalCredit}`)
    }

    // Generate entry number
    const countResult = await client.query(`SELECT COUNT(*) FROM journal_entries`)
    const count = parseInt(countResult.rows[0].count, 10) + 1
    const entryNo = `JE-${String(count).padStart(6, '0')}`

    const entryResult = await client.query(
      `INSERT INTO journal_entries (entry_no, description, entry_date, total_debit, total_credit, status, posted_by)
       VALUES ($1, $2, $3, $4, $5, 'posted', $6)
       RETURNING id, entry_no`,
      [entryNo, description, entryDate.toISOString().split('T')[0], totalDebit, totalCredit, postedBy]
    )
    const entryId = entryResult.rows[0].id

    for (const line of lines) {
      if (line.debit === 0 && line.credit === 0) continue
      await client.query(
        `INSERT INTO journal_lines (entry_id, account_id, debit, credit, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [entryId, line.accountId, line.debit, line.credit, line.description || null]
      )
    }

    await client.query('COMMIT')
    return { entryId, entryNo, totalDebit, totalCredit }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

/**
 * Recalculates a savings account balance from its transaction records.
 * This is the source of truth for balance verification.
 */
export async function recalculateSavingsBalance(accountId: string): Promise<number> {
  const result = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN type IN ('deposit', 'interest', 'transfer_in') THEN amount ELSE 0 END), 0) as total_in,
       COALESCE(SUM(CASE WHEN type IN ('withdrawal', 'fee', 'transfer_out') THEN amount ELSE 0 END), 0) as total_out
     FROM savings_transactions
     WHERE account_id = $1 AND is_deleted = false`,
    [accountId]
  )

  const totalIn = parseFloat(result.rows[0].total_in || 0)
  const totalOut = parseFloat(result.rows[0].total_out || 0)
  return totalIn - totalOut
}

/**
 * Verifies that a savings account's stored balance matches the transaction-derived balance.
 * Returns true if they match (within a small tolerance for rounding).
 */
export async function verifySavingsBalance(accountId: string): Promise<boolean> {
  const accountResult = await query(
    `SELECT balance FROM savings_accounts WHERE id = $1 AND is_deleted = false`,
    [accountId]
  )

  if (accountResult.rows.length === 0) return false

  const storedBalance = parseFloat(accountResult.rows[0].balance)
  const calculatedBalance = await recalculateSavingsBalance(accountId)

  // Allow tolerance of 0.01 for rounding differences
  return Math.abs(storedBalance - calculatedBalance) < 0.01
}

/**
 * Recalculates a loan's outstanding balance from repayment records.
 */
export async function recalculateLoanBalance(loanId: string): Promise<{
  principal: number
  totalPaid: number
  outstanding: number
}> {
  const loanResult = await query(
    `SELECT principal FROM loans WHERE id = $1 AND is_deleted = false`,
    [loanId]
  )

  if (loanResult.rows.length === 0) {
    throw new Error('Loan not found')
  }

  const principal = parseFloat(loanResult.rows[0].principal)

  const paymentResult = await query(
    `SELECT COALESCE(SUM(amount), 0) as total_paid
     FROM loan_repayments
     WHERE loan_id = $1 AND is_deleted = false`,
    [loanId]
  )

  const totalPaid = parseFloat(paymentResult.rows[0].total_paid || 0)
  const outstanding = Math.max(0, principal - totalPaid)

  return { principal, totalPaid, outstanding }
}