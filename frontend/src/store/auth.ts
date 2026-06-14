import { create } from 'zustand'
import type { AuthSession } from '@/services/auth'

interface AuthState {
  user: AuthSession | null
  setUser: (user: AuthSession | null) => void
  isAuthenticated: boolean
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user, isAuthenticated: user !== null }),
  isAuthenticated: false,
}))
