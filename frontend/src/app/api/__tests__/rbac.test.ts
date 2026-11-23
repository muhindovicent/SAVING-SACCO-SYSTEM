import { requireRole, hasRoleAccess } from '@/lib/rbac'

describe('Role-Based Access Control', () => {
  describe('hasRoleAccess', () => {
    it('allows admin to access admin routes', () => {
      expect(hasRoleAccess({ userId: '1', email: 'a@b.com', role: 'admin' }, '/admin/dashboard')).toBe(true)
      expect(hasRoleAccess({ userId: '1', email: 'a@b.com', role: 'admin' }, '/admin/members')).toBe(true)
    })

    it('allows treasurer to access treasurer routes', () => {
      expect(hasRoleAccess({ userId: '1', email: 'a@b.com', role: 'treasurer' }, '/treasurer/dashboard')).toBe(true)
      expect(hasRoleAccess({ userId: '1', email: 'a@b.com', role: 'treasurer' }, '/treasurer/collections')).toBe(true)
    })

    it('allows loan_officer to access loan-officer routes', () => {
      expect(hasRoleAccess({ userId: '1', email: 'a@b.com', role: 'loan_officer' }, '/loan-officer/dashboard')).toBe(true)
      expect(hasRoleAccess({ userId: '1', email: 'a@b.com', role: 'loan_officer' }, '/loan-officer/applications')).toBe(true)
    })

    it('allows member to access member routes', () => {
      expect(hasRoleAccess({ userId: '1', email: 'a@b.com', role: 'member' }, '/member/dashboard')).toBe(true)
      expect(hasRoleAccess({ userId: '1', email: 'a@b.com', role: 'member' }, '/member/savings')).toBe(true)
    })

    it('denies cross-role access', () => {
      expect(hasRoleAccess({ userId: '1', email: 'a@b.com', role: 'member' }, '/admin/dashboard')).toBe(false)
      expect(hasRoleAccess({ userId: '1', email: 'a@b.com', role: 'treasurer' }, '/admin/members')).toBe(false)
      expect(hasRoleAccess({ userId: '1', email: 'a@b.com', role: 'loan_officer' }, '/member/savings')).toBe(false)
    })

    it('denies unknown roles', () => {
      expect(hasRoleAccess({ userId: '1', email: 'a@b.com', role: 'unknown' as any }, '/admin/dashboard')).toBe(false)
    })
  })

  describe('requireRole', () => {
    it('allows access when role matches', async () => {
      const handler = jest.fn(() => Promise.resolve(new Response('ok')))
      const wrapped = requireRole(['admin', 'treasurer'])(handler)

      const request = new NextRequest('http://localhost:3000/api/test')
      const session = { userId: '1', email: 'a@b.com', role: 'admin' }

      const result = await wrapped(request as any, session)
      expect(handler).toHaveBeenCalledWith(request, session)
      expect(result.status).toBe(200)
    })

    it('denies access when role does not match', async () => {
      const handler = jest.fn()
      const wrapped = requireRole(['admin'])(handler)

      const request = new NextRequest('http://localhost:3000/api/test')
      const session = { userId: '1', email: 'a@b.com', role: 'member' }

      const result = await wrapped(request as any, session)
      expect(handler).not.toHaveBeenCalled()
      expect(result.status).toBe(403)
    })
  })
})