'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Member } from '@/lib/types'

export default function MemberProfile() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)
  const [profile, setProfile] = useState<Member | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'member') { router.push('/auth/login'); return }
    setUser(session)

    const memberId = session.memberNo || session.userId
    const members = DB.get<Member[]>('members') || []
    const myProfile = members.find(m => m.id === memberId || m.memberNo === memberId)
    setProfile(myProfile || null)
  }, [])

  const handleSave = () => {
    if (!profile) return
    const members = DB.get<Member[]>('members') || []
    const updated = members.map(m => m.id === profile.id ? profile : m)
    DB.set('members', updated)
    setEditing(false)
  }

  if (!profile) {
    return (
      <div className="p-4 md:p-6">
        <div className="glass p-8 glow text-center">
          <p className="text-[#8DA88D]">Profile not found. Contact the admin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#E8F5E9]">My Profile</h1>

      <div className="glass p-6 glow max-w-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#8DA88D] mb-1">Member No</label>
            <input readOnly value={profile.memberNo} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] opacity-60" />
          </div>
          <div>
            <label className="block text-sm text-[#8DA88D] mb-1">Status</label>
            <input readOnly value={profile.status || 'active'} className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] opacity-60" />
          </div>
          <div>
            <label className="block text-sm text-[#8DA88D] mb-1">First Name</label>
            <input value={profile.firstName} disabled={!editing} onChange={e => setProfile({ ...profile, firstName: e.target.value })}
              className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
          </div>
          <div>
            <label className="block text-sm text-[#8DA88D] mb-1">Last Name</label>
            <input value={profile.lastName} disabled={!editing} onChange={e => setProfile({ ...profile, lastName: e.target.value })}
              className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
          </div>
          <div>
            <label className="block text-sm text-[#8DA88D] mb-1">Phone</label>
            <input value={profile.phone} disabled={!editing} onChange={e => setProfile({ ...profile, phone: e.target.value })}
              className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
          </div>
          <div>
            <label className="block text-sm text-[#8DA88D] mb-1">Email</label>
            <input value={profile.email} disabled={!editing} onChange={e => setProfile({ ...profile, email: e.target.value })}
              className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
          </div>
          <div>
            <label className="block text-sm text-[#8DA88D] mb-1">ID Number</label>
            <input value={profile.idNumber} disabled={!editing} onChange={e => setProfile({ ...profile, idNumber: e.target.value })}
              className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-2.5 text-[#E8F5E9] focus:outline-none focus:border-[#B6E62E]" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          {editing ? (
            <>
              <button onClick={handleSave} className="bg-[#B6E62E] text-[#0A1404] font-semibold px-6 py-2.5 rounded-lg hover:bg-[#9DCB1F] transition text-sm">Save</button>
              <button onClick={() => setEditing(false)} className="bg-[#1E2D12] text-[#8DA88D] px-6 py-2.5 rounded-lg hover:bg-[#2A3D18] transition text-sm">Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="bg-[#B6E62E] text-[#0A1404] font-semibold px-6 py-2.5 rounded-lg hover:bg-[#9DCB1F] transition text-sm">Edit Profile</button>
          )}
        </div>
      </div>
    </div>
  )
}
