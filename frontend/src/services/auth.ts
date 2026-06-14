import DB from './db'
import { AUTH_KEY } from '@/lib/constants'
import type { User } from '@/lib/types'

export interface AuthSession {
  userId: string
  email: string
  role: 'admin' | 'treasurer' | 'member'
  name: string
  memberNo?: string
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
  return session
}

export function logout(): void {
  DB.remove('auth_user')
}

export function getSession(): AuthSession | null {
  return DB.get<AuthSession>('auth_user')
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}
