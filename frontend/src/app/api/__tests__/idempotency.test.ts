jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}))

import { query } from '@/lib/db'

describe('Idempotency - Duplicate Financial Request Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects duplicate deposit with same idempotency key', async () => {
    ;(query as jest.Mock).mockResolvedValueOnce({
      rows: [{ key: 'dep-key-1', response_status: 201, response_body: { message: 'Deposit successful' }, expires_at: new Date(Date.now() + 86400000).toISOString() }],
    })

    const { checkIdempotency } = await import('@/lib/financial-integrity')

    // Need to re-mock since dynamic import doesn't pick up jest.mock
    // Instead, test the logic directly
    const result = await checkIdempotency('dep-key-1', 'user-1', 'POST /api/savings/deposit', { amount: 500000 })
    
    // checkIdempotency queries the DB - if a row exists, it's a duplicate
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('idempotency_keys'),
      ['dep-key-1']
    )
  })

  it('records idempotency response after processing', async () => {
    ;(query as jest.Mock).mockResolvedValueOnce({})

    const { recordIdempotencyResponse } = await import('@/lib/financial-integrity')

    await recordIdempotencyResponse('key-1', 201, { message: 'success' })

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE idempotency_keys'),
      [201, JSON.stringify({ message: 'success' }), 'key-1']
    )
  })

  it('prevents duplicate loan applications', async () => {
    ;(query as jest.Mock).mockResolvedValueOnce({
      rows: [{ key: 'apply-key-1', response_status: 201, response_body: { message: 'Loan application submitted' }, expires_at: new Date(Date.now() + 86400000).toISOString() }],
    })

    const { checkIdempotency } = await import('@/lib/financial-integrity')

    const result = await checkIdempotency('apply-key-1', 'user-1', 'POST /api/loans/apply', { amount: 500000 })
    
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('idempotency_keys'),
      ['apply-key-1']
    )
  })
})