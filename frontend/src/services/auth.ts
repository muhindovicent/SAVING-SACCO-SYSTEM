import DB from './db'
import { AUTH_KEY } from '@/lib/constants'
import type { User } from '@/lib/types'

export interface AuthSession {
  userId: string
  email: string
  role: 'admin' | 'treasurer' | 'loan_officer' | 'member'
  name: string
  memberNo?: string
}

function setCookie(name: string, value: any, days = 7) {
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))};expires=${date.toUTCString()};path=/`
}

function removeCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
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
  removeCookie(AUTH_KEY)
}

export function getSession(): AuthSession | null {
  return DB.get<AuthSession>('auth_user')
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}
