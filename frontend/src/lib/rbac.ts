import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, TokenPayload } from '@/lib/auth'

const ROUTE_PREFIXES: Record<string, string[]> = {
  admin: ['/admin'],
  treasurer: ['/treasurer'],
  loan_officer: ['/loan-officer'],
  member: ['/member'],
}

export function getSessionFromRequest(request: NextRequest): TokenPayload | null {
  const token = request.cookies.get('access_token')?.value
  if (!token) return null
  return verifyAccessToken(token)
}

export function requireAuth(handler: (request: NextRequest, session: TokenPayload) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = getSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return handler(request, session)
  }
}

export function requireRole(allowedRoles: string[]) {
  return (handler: (request: NextRequest, session: TokenPayload) => Promise<NextResponse>) => {
    return requireAuth(async (request, session) => {
      if (!allowedRoles.includes(session.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
      return handler(request, session)
    })
  }
}

export function hasRoleAccess(session: TokenPayload, path: string): boolean {
  const prefixes = ROUTE_PREFIXES[session.role]
  if (!prefixes) return false
  return prefixes.some((p) => path.startsWith(p))
}