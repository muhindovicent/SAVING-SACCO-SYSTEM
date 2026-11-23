import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyAccessToken, TokenPayload } from '@/lib/auth'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = request.cookies.get('access_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = verifyAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const result = await query(
      `SELECT id, email, role, is_active, is_deleted, last_login FROM users WHERE id = $1`,
      [payload.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = result.rows[0]

    if (user.is_deleted || !user.is_active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        lastLogin: user.last_login,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Session check failed' }, { status: 500 })
  }
}