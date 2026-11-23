import { recalculateSavingsBalance, verifySavingsBalance } from '@/lib/financial-integrity'

// Mock the query function
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}))

import { query } from '@/lib/db'

describe('Financial integrity utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('recalculateSavingsBalance', () => {
    it('calculates balance from deposits and withdrawals', async () => {
      ;(query as jest.Mock).mockResolvedValueOnce({
        rows: [{ total_in: '3000000', total_out: '500000' }],
      })

      const balance = await recalculateSavingsBalance('account-1')
      expect(balance).toBe(2500000)
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('savings_transactions'),
        ['account-1']
      )
    })

    it('returns 0 when no transactions exist', async () => {
      ;(query as jest.Mock).mockResolvedValueOnce({
        rows: [{ total_in: null, total_out: null }],
      })

      const balance = await recalculateSavingsBalance('empty-account')
      expect(balance).toBe(0)
    })

    it('handles interest and transfer_in as positive', async () => {
      ;(query as jest.Mock).mockResolvedValueOnce({
        rows: [{ total_in: '1000000', total_out: '200000' }],
      })

      const balance = await recalculateSavingsBalance('interest-account')
      expect(balance).toBe(800000)
    })
  })

  describe('verifySavingsBalance', () => {
    it('returns true when stored balance matches calculated', async () => {
      ;(query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ balance: '2500000' }] })
        .mockResolvedValueOnce({ rows: [{ total_in: '3000000', total_out: '500000' }] })

      const isValid = await verifySavingsBalance('account-1')
      expect(isValid).toBe(true)
    })

    it('returns false when stored balance does not match calculated', async () => {
      ;(query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ balance: '9999999' }] })
        .mockResolvedValueOnce({ rows: [{ total_in: '3000000', total_out: '500000' }] })

      const isValid = await verifySavingsBalance('account-1')
      expect(isValid).toBe(false)
    })

    it('returns false when account does not exist', async () => {
      ;(query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      const isValid = await verifySavingsBalance('nonexistent')
      expect(isValid).toBe(false)
    })
  })
})