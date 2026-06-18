import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password']
const rolePrefixes: Record<string, string[]> = {
  admin: ['/admin'],
  treasurer: ['/treasurer'],
  loan_officer: ['/loan-officer'],
  member: ['/member'],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const authCookie = request.cookies.get('sacco_auth_user')?.value
  if (!authCookie) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const session = JSON.parse(decodeURIComponent(authCookie))
    const role = session.role as string
    const allowedPrefixes = rolePrefixes[role]

    if (!allowedPrefixes || !allowedPrefixes.some(p => pathname.startsWith(p))) {
      const dashboardUrl = new URL(`/${role}/dashboard`, request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  } catch {
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo).*)'],
}
