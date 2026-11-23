'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithApi } from '@/services/auth'
import { useAuthStore } from '@/store/auth'
import { seedDemoData } from '@/lib/seed'

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { seedDemoData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const session = await loginWithApi(email, password)
      if (!session) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }
      setUser(session)
      const roleRoutes: Record<string, string> = {
        admin: '/admin/dashboard',
        treasurer: '/treasurer/dashboard',
        loan_officer: '/loan-officer/dashboard',
        member: '/member/dashboard',
      }
      router.push(roleRoutes[session.role] || '/member/dashboard')
    } catch {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass p-8 glow">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <img src="/logo/logo.png" alt="Jenga Wealth" className="h-20 w-20 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
        <h1 className="text-2xl font-bold text-[#B6E62E] glow-text">Jenga Wealth</h1>
        <p className="text-sm text-[#8DA88D] mt-1">SACCO Management System</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[#8DA88D] mb-1">Email or Username</label>
          <input
            type="text"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-3 text-[#E8F5E9] placeholder-[#8DA88D] focus:outline-none focus:border-[#B6E62E] focus:ring-1 focus:ring-[#B6E62E] transition"
            placeholder="admin or you@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-[#8DA88D] mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-3 text-[#E8F5E9] placeholder-[#8DA88D] focus:outline-none focus:border-[#B6E62E] focus:ring-1 focus:ring-[#B6E62E] transition"
            placeholder="Enter your password"
            required
          />
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#B6E62E] text-[#0A1404] font-semibold py-3 rounded-lg hover:bg-[#9DCB1F] transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <div className="animate-spin h-4 w-4 border-2 border-[#0A1404] border-t-transparent rounded-full" />}
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <div className="mt-6 text-center space-y-1">
        <p className="text-xs text-[#8DA88D]">Contact your SACCO administrator for login credentials.</p>
      </div>
    </div>
  )
}
