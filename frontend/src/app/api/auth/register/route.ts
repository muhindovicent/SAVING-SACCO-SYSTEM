import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { hash } from 'bcryptjs'
import { verifyAccessToken } from '@/lib/auth'
import { requireRole } from '@/lib/rbac'
import { registerSchema, validateBody } from '@/lib/validation'

export async function POST(request: NextRequest): Promise<NextResponse> {
  return requireRole(['admin'])(request, async (_req, session) => {
    try {
      const body = await request.json()
      const { data, error } = validateBody(registerSchema, body)
      if (error) {
        return NextResponse.json({ error }, { status: 400 })
      }

      const { email, password, role, firstName, lastName, phone, idNumber, memberNo } = data

      const existing = await query(`SELECT id FROM users WHERE email = $1`, [email])
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      }

      const passwordHash = await hash(password, 12)

      const userResult = await query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
        [email, passwordHash, role]
      )
      const userId = userResult.rows[0].id

      let memberId: string | null = null
      if (role === 'member' && memberNo) {
        const memberResult = await query(
          `INSERT INTO members (user_id, member_no, first_name, last_name, phone, id_number) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [userId, memberNo, firstName || '', lastName || '', phone || null, idNumber || null]
        )
        memberId = memberResult.rows[0].id
      }

      return NextResponse.json({
        message: 'User registered successfully',
        userId,
        memberId,
      }, { status: 201 })
    } catch {
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
    }
  })
}