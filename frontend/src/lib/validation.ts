import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'treasurer', 'loan_officer', 'member']),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().optional(),
  idNumber: z.string().optional(),
  memberNo: z.string().optional(),
})

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { data: T; error: string | null } {
  const result = schema.safeParse(body)
  if (!result.success) {
    const errors = result.error.errors.map((e) => e.message).join(', ')
    return { data: null as unknown as T, error: errors }
  }
  return { data: result.data, error: null }
}