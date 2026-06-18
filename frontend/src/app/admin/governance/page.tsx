'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'

interface Meeting {
  id: string; title: string; date: string; type: string; venue: string; status: string; minutes: string
}

interface Resolution {
  id: string; title: string; description: string; proposedBy: string; status: string; meetingId: string; createdAt: string
}

export default function AdminGovernance() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [resolutions, setResolutions] = useState<Resolution[]>([])
  const [tab, setTab] = useState<'meetings' | 'resolutions'>('meetings')

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'admin') { router.push('/auth/login'); return }
    setUser(session)
    setMeetings(DB.get<Meeting[]>('meetings') || [])
    setResolutions(DB.get<Resolution[]>('resolutions') || [])
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl font-bold text-[#E8F5E9]">Governance</h1>

      <div className="flex gap-2">
        <button onClick={() => setTab('meetings')} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${tab === 'meetings' ? 'bg-[#B6E62E] text-[#0A1404]' : 'bg-[#1E2D12] text-[#8DA88D] hover:bg-[#2A3D18]'}`}>Meetings</button>
        <button onClick={() => setTab('resolutions')} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${tab === 'resolutions' ? 'bg-[#B6E62E] text-[#0A1404]' : 'bg-[#1E2D12] text-[#8DA88D] hover:bg-[#2A3D18]'}`}>Resolutions</button>
      </div>

      {tab === 'meetings' ? (
        <div className="glass overflow-hidden glow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A3D18]">
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Title</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Venue</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {meetings.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[#8DA88D] text-sm">No meetings recorded</td></tr>
                ) : meetings.map(m => (
                  <tr key={m.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                    <td className="px-4 py-3 text-sm text-[#E8F5E9]">{m.title}</td>
                    <td className="px-4 py-3 text-sm text-[#8DA88D]">{new Date(m.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-[#8DA88D]">{m.type}</td>
                    <td className="px-4 py-3 text-sm text-[#8DA88D]">{m.venue}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${m.status === 'completed' ? 'badge-green' : m.status === 'scheduled' ? 'badge-blue' : 'badge-yellow'}`}>{m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass overflow-hidden glow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A3D18]">
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Title</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Proposed By</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs text-[#8DA88D] uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {resolutions.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[#8DA88D] text-sm">No resolutions recorded</td></tr>
                ) : resolutions.map(r => (
                  <tr key={r.id} className="border-b border-[#2A3D18]/50 hover:bg-[#1E2D12] transition">
                    <td className="px-4 py-3 text-sm text-[#E8F5E9]">{r.title}</td>
                    <td className="px-4 py-3 text-sm text-[#8DA88D]">{r.proposedBy}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${r.status === 'passed' ? 'badge-green' : r.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>{r.status}</span></td>
                    <td className="px-4 py-3 text-sm text-[#8DA88D]">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
