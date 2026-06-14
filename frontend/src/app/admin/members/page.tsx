'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Member } from '@/lib/types'

export default function AdminMembers() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'admin') { router.push('/auth/login'); return }
    setUser(session)
    setMembers(DB.get<Member[]>('members') || [])
  }, [])

  const filtered = members.filter(m =>
    m.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    m.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    m.memberNo?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8F5E9]">Members</h1>
          <p className="text-sm text-[#8DA88D]">{members.length} total members</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search members..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full md:w-96 bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] placeholder-[#8DA88D] focus:outline-none focus:border-[#B6E62E]"
      />

      <div className="glass overflow-hidden glow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2A3D18]">
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">No</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Phone</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">ID</th>
                <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8DA88D] text-sm">No members found</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                  <td className="px-4 py-3 text-sm text-[#B6E62E]">{m.memberNo}</td>
                  <td className="px-4 py-3 text-sm text-[#E8F5E9]">{m.firstName} {m.lastName}</td>
                  <td className="px-4 py-3 text-sm text-[#8DA88D]">{m.phone}</td>
                  <td className="px-4 py-3 text-sm text-[#8DA88D]">{m.email}</td>
                  <td className="px-4 py-3 text-sm text-[#8DA88D]">{m.idNumber}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-[#B6E62E]/10 text-[#B6E62E]">{m.status || 'active'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
