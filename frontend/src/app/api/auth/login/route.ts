import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { compare } from 'bcryptjs'
import { createAccessToken, createRefreshToken, setAuthCookies, TokenPayload } from '@/lib/auth'
import { loginSchema, validateBody } from '@/lib/validation'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { data, error } = validateBody(loginSchema, body)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    const { email, password } = data

    const result = await query(
      `SELECT id, email, password_hash, role, is_active, is_deleted FROM users WHERE email = $1`,
      [email]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const user = result.rows[0]

    if (user.is_deleted || !user.is_active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 401 })
    }

    const valid = await compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = createAccessToken(payload)
    const refreshToken = createRefreshToken(payload)
    setAuthCookies(accessToken, refreshToken)

    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [user.id])

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}