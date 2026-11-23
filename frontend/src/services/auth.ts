import DB from './db'
import { AUTH_KEY } from '@/lib/constants'
import { authApi } from './api'
import type { User } from '@/lib/types'

export interface AuthSession {
  userId: string
  email: string
  role: 'admin' | 'treasurer' | 'loan_officer' | 'member'
  name: string
  memberNo?: string
}

const ROLE_MAP: Record<string, AuthSession['role']> = {
  ADMINISTRATOR: 'admin',
  TREASURER: 'treasurer',
  LOAN_OFFICER: 'loan_officer',
  AUDITOR: 'admin',
  BOARD_MEMBER: 'admin',
  MEMBER: 'member',
}

function setCookie(name: string, value: any, days = 7) {
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))};expires=${date.toUTCString()};path=/`
}

function removeCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
}

function storeSession(session: AuthSession, accessToken: string, refreshToken: string) {
  DB.set('auth_user', session)
  localStorage.setItem('sacco_token', JSON.stringify({ accessToken }))
  localStorage.setItem('sacco_refresh_token', refreshToken)
  setCookie(AUTH_KEY, session)
}

export async function loginWithApi(username: string, password: string): Promise<AuthSession | null> {
  try {
    const res = await authApi.login(username, password)
    const backendRole = res.user.role as string
    const session: AuthSession = {
      userId: res.user.id,
      email: res.user.email,
      role: ROLE_MAP[backendRole] || 'member',
      name: res.user.username || res.user.email,
      memberNo: undefined,
    }
    storeSession(session, res.accessToken, res.refreshToken)
    return session
  } catch {
    return null
  }
}

export function login(email: string, password: string): AuthSession | null {
  const users = DB.get<User[]>('users') || []
  const user = users.find(u => u.email === email && u.password === password)
  if (!user) return null
  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    memberNo: user.memberNo,
  }
  DB.set('auth_user', session)
  setCookie(AUTH_KEY, session)
  return session
}

export function logout(): void {
  DB.remove('auth_user')
  localStorage.removeItem('sacco_token')
  localStorage.removeItem('sacco_refresh_token')
  removeCookie(AUTH_KEY)
}

export function getSession(): AuthSession | null {
  return DB.get<AuthSession>('auth_user')
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}
