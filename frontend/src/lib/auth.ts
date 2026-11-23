import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || 'change-me'
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || 'change-me'

if (!process.env.NEXTAUTH_SECRET) {
  console.warn('NEXTAUTH_SECRET is not set. Using insecure fallback. Set a strong secret in production.')
}

export interface TokenPayload {
  userId: string
  email: string
  role: string
  memberNo?: string
}

export function createAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m', issuer: 'jenga-wealth' })
}

export function createRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d', issuer: 'jenga-wealth' })
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export function setAuthCookies(accessToken: string, refreshToken: string): void {
  const cookieStore = cookies()
  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  })
  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
}

export function clearAuthCookies(): void {
  const cookieStore = cookies()
  cookieStore.set('access_token', '', { httpOnly: true, path: '/', maxAge: 0 })
  cookieStore.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: 0 })
}

export function getAccessTokenFromCookies(): string | null {
  const cookieStore = cookies()
  return cookieStore.get('access_token')?.value || null
}

export function getRefreshTokenFromCookies(): string | null {
  const cookieStore = cookies()
  return cookieStore.get('refresh_token')?.value || null
}