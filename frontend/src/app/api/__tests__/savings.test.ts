import { NextRequest } from 'next/server'

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}))

import { query, getClient } from '@/lib/db'
import { checkIdempotency, recordIdempotencyResponse, verifySavingsBalance } from '@/lib/financial-integrity'

// Mock financial-integrity module
jest.mock('@/lib/financial-integrity', () => ({
  checkIdempotency: jest.fn(),
  recordIdempotencyResponse: jest.fn(),
  verifySavingsBalance: jest.fn(),
}))

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
}

describe('Savings API - Deposit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getClient as jest.Mock).mockResolvedValue(mockClient)
  })

  it('successfully deposits to an active account', async () => {
    ;(mockClient.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 'acc-1', member_id: 'mem-1', balance: '2000000', status: 'active' }] }) // FOR UPDATE
      .mockResolvedValueOnce({ rows: [] }) // member check for non-member role
      .mockResolvedValueOnce({}) // UPDATE balance
      .mockResolvedValueOnce({ rows: [{ id: 'txn-1', type: 'deposit', amount: '500000', balance_before: '2000000', balance_after: '2500000', reference: 'DEP-001' }] }) // INSERT transaction
      .mockResolvedValueOnce({}) // INSERT audit log
      .mockResolvedValueOnce({}) // UPDATE idempotency
      .mockResolvedValueOnce({ rows: [{ valid: true }] }) // verify balance

    ;(checkIdempotency as jest.Mock).mockResolvedValueOnce({ isDuplicate: false, existingResponse: null })
    ;(verifySavingsBalance as jest.Mock).mockResolvedValueOnce(true)

    const { POST } = await import('@/app/api/savings/deposit/route')

    const request = new NextRequest('http://localhost:3000/api/savings/deposit', {
      method: 'POST',
      body: JSON.stringify({
        accountId: 'acc-1',
        amount: 500000,
        reference: 'DEP-001',
        idempotencyKey: 'key-1',
      }),
    })

    // Mock session - admin role
    jest.mock('@/lib/rbac', () => ({
      requireRole: (roles: string[]) => (handler: any) => (req: any, session: any) => handler(req, session),
    }))

    const response = await POST(request as any, { params: {} } as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message).toBe('Deposit successful')
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('BEGIN'),
      []
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('COMMIT'),
      []
    )
  })

  it('rejects insufficient funds on withdrawal', async () => {
    ;(mockClient.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 'acc-1', member_id: 'mem-1', balance: '100000', status: 'active' }] })

    ;(checkIdempotency as jest.Mock).mockResolvedValueOnce({ isDuplicate: false, existingResponse: null })

    const { POST } = await import('@/app/api/savings/withdraw/route')

    const request = new NextRequest('http://localhost:3000/api/savings/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        accountId: 'acc-1',
        amount: 500000,
        reference: 'WTH-001',
        idempotencyKey: 'key-2',
      }),
    })

    const response = await request.json() // consume body
    // Re-create request since body was consumed
    const request2 = new NextRequest('http://localhost:3000/api/savings/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        accountId: 'acc-1',
        amount: 500000,
        reference: 'WTH-001',
        idempotencyKey: 'key-2',
      }),
    })

    const { POST: withdrawPOST } = await import('@/app/api/savings/withdraw/route')
    const result = await withdrawPOST(request2 as any, { params: {} } as any)
    const data = await result.json()

    expect(result.status).toBe(400)
    expect(data.error).toBe('Insufficient funds')
  })

  it('returns duplicate response for same idempotency key', async () => {
    ;(checkIdempotency as jest.Mock).mockResolvedValueOnce({
      isDuplicate: true,
      existingResponse: { status: 201, body: { message: 'Already processed' } },
    })

    const { POST } = await import('@/app/api/savings/deposit/route')

    const request = new NextRequest('http://localhost:3000/api/savings/deposit', {
      method: 'POST',
      body: JSON.stringify({
        accountId: 'acc-1',
        amount: 500000,
        reference: 'DEP-001',
        idempotencyKey: 'duplicate-key',
      }),
    })

    const response = await POST(request as any, { params: {} } as any)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message).toBe('Already processed')
    expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('BEGIN'))
  })
})