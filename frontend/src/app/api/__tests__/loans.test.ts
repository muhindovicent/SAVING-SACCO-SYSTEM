jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}))

import { query, getClient } from '@/lib/db'
import { checkIdempotency, recordIdempotencyResponse } from '@/lib/financial-integrity'

jest.mock('@/lib/financial-integrity', () => ({
  checkIdempotency: jest.fn(),
  recordIdempotencyResponse: jest.fn(),
}))

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
}

describe('Loans API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getClient as jest.Mock).mockResolvedValue(mockClient)
  })

  describe('POST /api/loans/apply', () => {
    it('creates a loan application for a member', async () => {
      ;(query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'mem-1' }] }) // member lookup
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // count for app number
        .mockResolvedValueOnce({ rows: [{ id: 'app-1', member_id: 'mem-1', loan_type: 'Emergency', amount: '500000', status: 'pending' }] }) // insert
        .mockResolvedValueOnce({}) // update app number
        .mockResolvedValueOnce({}) // audit log

      ;(checkIdempotency as jest.Mock).mockResolvedValueOnce({ isDuplicate: false, existingResponse: null })
      ;(recordIdempotencyResponse as jest.Mock).mockResolvedValueOnce({})

      const { POST } = await import('@/app/api/loans/apply/route')

      const request = new NextRequest('http://localhost:3000/api/loans/apply', {
        method: 'POST',
        body: JSON.stringify({
          loanType: 'Emergency Loan',
          amount: 500000,
          purpose: 'Medical emergency',
          durationMonths: 6,
          idempotencyKey: 'apply-key-1',
        }),
      })

      const response = await request.json()
      const request2 = new NextRequest('http://localhost:3000/api/loans/apply', {
        method: 'POST',
        body: JSON.stringify({
          loanType: 'Emergency Loan',
          amount: 500000,
          purpose: 'Medical emergency',
          durationMonths: 6,
          idempotencyKey: 'apply-key-1',
        }),
      })

      const result = await (await import('@/app/api/loans/apply/route')).POST(request2 as any, { params: {} } as any)
      const data = await result.json()

      expect(result.status).toBe(201)
      expect(data.message).toBe('Loan application submitted')
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO loan_applications"),
        expect.arrayContaining(['mem-1', 'Emergency Loan', 500000, 'Medical emergency', 6])
      )
    })

    it('rejects invalid input', async () => {
      const { POST } = await import('@/app/api/loans/apply/route')

      const request = new NextRequest('http://localhost:3000/api/loans/apply', {
        method: 'POST',
        body: JSON.stringify({
          loanType: '',
          amount: -100,
          durationMonths: 0,
          idempotencyKey: 'bad-key',
        }),
      })

      const result = await POST(request as any, { params: {} } as any)
      const data = await result.json()

      expect(result.status).toBe(400)
      expect(data.error).toBeTruthy()
    })
  })

  describe('PATCH /api/loans/[id]/approve', () => {
    it('approves a pending loan application and creates schedules', async () => {
      const loanId = 'app-1'
      ;(mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'app-1', member_id: 'mem-1', amount: '500000', duration_months: 6, status: 'pending', user_id: 'user-1' }] }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // loan count
        .mockResolvedValueOnce({ rows: [{ id: 'loan-1', loan_no: 'LN-0001', principal: '500000', interest_rate: '12', duration_months: 6, status: 'approved' }] }) // insert loan
        .mockResolvedValueOnce({}) // insert schedules (called 6 times)
        .mockResolvedValueOnce({}) // update application
        .mockResolvedValueOnce({}) // audit log

      ;(checkIdempotency as jest.Mock).mockResolvedValueOnce({ isDuplicate: false, existingResponse: null })
      ;(recordIdempotencyResponse as jest.Mock).mockResolvedValueOnce({})

      const { PATCH } = await import('@/app/api/loans/[id]/approve/route')

      const request = new NextRequest(`http://localhost:3000/api/loans/${loanId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ interestRate: 12, idempotencyKey: 'approve-key-1' }),
      })

      const result = await PATCH(request as any, { params: { id: loanId } } as any)
      const data = await result.json()

      expect(result.status).toBe(200)
      expect(data.message).toBe('Loan approved')
      expect(data.totalInterest).toBeCloseTo(30000, 0) // 500000 * 0.12 * 0.5 = 30000
      expect(data.monthlyInstallment).toBeCloseTo(88333, 0)
    })
  })

  describe('POST /api/loans/[id]/repay', () => {
    it('repays a loan from member savings with sufficient funds', async () => {
      const loanId = 'loan-1'
      ;(mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'loan-1', member_id: 'mem-1', principal: '500000', status: 'active', loan_no: 'LN-0001', user_id: 'user-1' }] }) // loan FOR UPDATE
        .mockResolvedValueOnce({ rows: [{ id: 'mem-1' }] }) // member check
        .mockResolvedValueOnce({ rows: [{ id: 'sav-1', balance: '1000000' }] }) // savings FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE savings balance
        .mockResolvedValueOnce({}) // INSERT savings transaction
        .mockResolvedValueOnce({ rows: [{ id: 'sched-1', installment_no: 1, total_due: '88333', paid_amount: '0' }] }) // schedule FOR UPDATE
        .mockResolvedValueOnce({}) // UPDATE schedule
        .mockResolvedValueOnce({}) // INSERT repayment
        .mockResolvedValueOnce({}) // audit log
        .mockResolvedValueOnce({}) // UPDATE idempotency
        .mockResolvedValueOnce({ rows: [{ valid: true }] }) // verify balance

      ;(checkIdempotency as jest.Mock).mockResolvedValueOnce({ isDuplicate: false, existingResponse: null })
      ;(recordIdempotencyResponse as jest.Mock).mockResolvedValueOnce({})

      const { POST } = await import('@/app/api/loans/[id]/repay/route')

      const request = new NextRequest(`http://localhost:3000/api/loans/${loanId}/repay`, {
        method: 'POST',
        body: JSON.stringify({
          amount: 50000,
          paymentMethod: 'cash',
          reference: 'REPAY-001',
          idempotencyKey: 'repay-key-1',
        }),
      })

      const result = await POST(request as any, { params: { id: loanId } } as any)
      const data = await result.json()

      expect(result.status).toBe(200)
      expect(data.message).toBe('Repayment successful')
    })

    it('rejects repayment for non-active loan', async () => {
      const loanId = 'loan-2'
      ;(mockClient.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'loan-2', member_id: 'mem-1', principal: '500000', status: 'repaid', loan_no: 'LN-0002', user_id: 'user-1' }],
      })

      const { POST } = await import('@/app/api/loans/[id]/repay/route')

      const request = new NextRequest(`http://localhost:3000/api/loans/${loanId}/repay`, {
        method: 'POST',
        body: JSON.stringify({ amount: 10000, idempotencyKey: 'repay-key-2' }),
      })

      const result = await POST(request as any, { params: { id: loanId } } as any)
      const data = await result.json()

      expect(result.status).toBe(400)
      expect(data.error).toBe('Loan is not active')
    })
  })
})