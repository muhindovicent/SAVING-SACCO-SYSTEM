import { loginSchema, registerSchema, validateBody } from '@/lib/validation'

describe('Zod input validation', () => {
  describe('loginSchema', () => {
    it('accepts valid email and password', () => {
      const result = loginSchema.safeParse({ email: 'admin@example.com', password: 'password123' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('email')
      }
    })

    it('rejects short password', () => {
      const result = loginSchema.safeParse({ email: 'admin@example.com', password: '123' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('6 characters')
      }
    })

    it('rejects missing fields', () => {
      const result = loginSchema.safeParse({ email: 'admin@example.com' })
      expect(result.success).toBe(false)
    })
  })

  describe('registerSchema', () => {
    it('accepts valid registration data', () => {
      const result = registerSchema.safeParse({
        email: 'member@example.com',
        password: 'securePass123',
        role: 'member',
        firstName: 'John',
        lastName: 'Doe',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid role', () => {
      const result = registerSchema.safeParse({
        email: 'member@example.com',
        password: 'securePass123',
        role: 'superuser',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing required fields', () => {
      const result = registerSchema.safeParse({ email: 'member@example.com' })
      expect(result.success).toBe(false)
    })
  })

  describe('validateBody', () => {
    it('returns data and null error on success', () => {
      const { data, error } = validateBody(loginSchema, { email: 'a@b.com', password: 'pass123' })
      expect(error).toBeNull()
      expect(data.email).toBe('a@b.com')
    })

    it('returns null data and error message on failure', () => {
      const { data, error } = validateBody(loginSchema, { email: 'bad', password: 'x' })
      expect(data).toBeNull()
      expect(error).toBeTruthy()
      expect(typeof error).toBe('string')
    })
  })
})