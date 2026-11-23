import { authApi } from './api'

export interface AuthSession {
  userId: string
  email: string
  role: 'admin' | 'treasurer' | 'loan_officer' | 'member'
  name: string
  memberNo?: string
}

export async function loginWithApi(email: string, password: string): Promise<AuthSession | null> {
  try {
    const res = await authApi.login(email, password)
    return {
      userId: res.user.id,
      email: res.user.email,
      role: res.user.role as AuthSession['role'],
      name: res.user.email,
      memberNo: undefined,
    }
  } catch {
    return null
  }
}

export async function registerWithApi(data: {
  email: string
  password: string
  role: string
  firstName?: string
  lastName?: string
  phone?: string
  idNumber?: string
  memberNo?: string
}): Promise<{ success: boolean; userId?: string; memberId?: string; error?: string }> {
  try {
    const res = await authApi.register(data)
    return { success: true, userId: res.userId, memberId: res.memberId }
  } catch (err: any) {
    return { success: false, error: err.message || 'Registration failed' }
  }
}

export async function fetchSession(): Promise<AuthSession | null> {
  try {
    const res = await authApi.me()
    return {
      userId: res.user.id,
      email: res.user.email,
      role: res.user.role as AuthSession['role'],
      name: res.user.email,
    }
  } catch {
    return null
  }
}

export async function logoutWithApi(): Promise<void> {
  try {
    await authApi.logout()
  } catch {
    // ignore errors during logout
  }
}

export async function refreshSession(): Promise<boolean> {
  try {
    await authApi.refresh()
    return true
  } catch {
    return false
  }
}