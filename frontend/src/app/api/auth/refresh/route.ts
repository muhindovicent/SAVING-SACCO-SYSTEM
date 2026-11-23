import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyRefreshToken, createAccessToken, setAuthCookies, TokenPayload } from '@/lib/auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = request.cookies.get('refresh_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Refresh token required' }, { status: 401 })
    }

    const payload = verifyRefreshToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
    }

    const result = await query(
      `SELECT id, email, role, is_active, is_deleted FROM users WHERE id = $1`,
      [payload.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = result.rows[0]
    if (user.is_deleted || !user.is_active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 401 })
    }

    const newPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = createAccessToken(newPayload)
    setAuthCookies(accessToken, token)

    return NextResponse.json({ message: 'Token refreshed' })
  } catch {
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 })
  }
}