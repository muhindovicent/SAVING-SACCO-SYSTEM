jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}))

import { query } from '@/lib/db'

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('successfully logs in with valid credentials', async () => {
      const hashedPassword = '$2b$12$hashed.password.hash'
      ;(query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'user-1', email: 'admin@jengawealth.com', password_hash: hashedPassword, role: 'admin', is_active: true, is_deleted: false }],
      })

      const { compare } = await import('bcryptjs')
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true)

      const { POST } = await import('@/app/api/auth/login/route')

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@jengawealth.com', password: 'Admin@123' }),
      })

      const result = await POST(request as any, { params: {} } as any)
      const data = await result.json()

      expect(result.status).toBe(200)
      expect(data.user.email).toBe('admin@jengawealth.com')
      expect(data.user.role).toBe('admin')
    })

    it('rejects invalid credentials', async () => {
      ;(query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      const { POST } = await import('@/app/api/auth/login/route')

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'wrong@example.com', password: 'wrong' }),
      })

      const result = await POST(request as any, { params: {} } as any)
      const data = await result.json()

      expect(result.status).toBe(401)
      expect(data.error).toBe('Invalid email or password')
    })

    it('rejects deactivated account', async () => {
      ;(query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'user-1', email: 'admin@jengawealth.com', password_hash: '$2b$12$hash', role: 'admin', is_active: false, is_deleted: false }],
      })

      const { compare } = await import('bcryptjs')
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true)

      const { POST } = await import('@/app/api/auth/login/route')

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@jengawealth.com', password: 'Admin@123' }),
      })

      const result = await POST(request as any, { params: {} } as any)
      const data = await result.json()

      expect(result.status).toBe(401)
      expect(data.error).toBe('Account is deactivated')
    })
  })

  describe('POST /api/auth/register', () => {
    it('registers a new member (admin only)', async () => {
      ;(query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // no existing email
        .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] }) // insert user
        .mockResolvedValueOnce({ rows: [{ id: 'mem-1' }] }) // insert member
        .mockResolvedValueOnce({}) // audit log

      const { hash } = await import('bcryptjs')
      jest.spyOn(require('bcryptjs'), 'hash').mockResolvedValue('$2b$12$hashed')

      const { POST } = await import('@/app/api/auth/register/route')

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newmember@example.com',
          password: 'securePass123',
          role: 'member',
          firstName: 'New',
          lastName: 'Member',
          memberNo: 'M-001',
        }),
      })

      const result = await POST(request as any, { params: {} } as any)
      const data = await result.json()

      expect(result.status).toBe(201)
      expect(data.message).toBe('User registered successfully')
      expect(data.userId).toBe('user-1')
      expect(data.memberId).toBe('mem-1')
    })

    it('rejects duplicate email', async () => {
      ;(query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'user-1' }] })

      const { POST } = await import('@/app/api/auth/register/route')

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'pass123',
          role: 'member',
          memberNo: 'M-002',
        }),
      })

      const result = await POST(request as any, { params: {} } as any)
      const data = await result.json()

      expect(result.status).toBe(409)
      expect(data.error).toBe('Email already registered')
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns user session for valid token', async () => {
      ;(query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'user-1', email: 'admin@jengawealth.com', role: 'admin', is_active: true, is_deleted: false, last_login: '2026-01-01T00:00:00Z' }],
      })

      const { GET } = await import('@/app/api/auth/me/route')

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: { cookie: 'access_token=valid-token' },
      })

      const result = await GET(request as any, { params: {} } as any)
      const data = await result.json()

      expect(result.status).toBe(200)
      expect(data.user.email).toBe('admin@jengawealth.com')
    })

    it('returns 401 without token', async () => {
      const { GET } = await import('@/app/api/auth/me/route')

      const request = new NextRequest('http://localhost:3000/api/auth/me')

      const result = await GET(request as any, { params: {} } as any)
      const data = await result.json()

      expect(result.status).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('returns success on logout', async () => {
      const { POST } = await import('@/app/api/auth/logout/route')

      const request = new NextRequest('http://localhost:3000/api/auth/logout', { method: 'POST' })
      const result = await POST(request as any, { params: {} } as any)
      const data = await result.json()

      expect(result.status).toBe(200)
      expect(data.message).toBe('Logged out successfully')
    })
  })
})