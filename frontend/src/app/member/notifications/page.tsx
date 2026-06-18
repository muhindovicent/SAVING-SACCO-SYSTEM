'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getSession } from '@/services/auth'
import DB from '@/services/db'
import type { Notification } from '@/lib/types'

export default function MemberNotifications() {
  const router = useRouter()
  const setUser = useAuthStore(s => s.setUser)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const session = getSession()
    if (!session || session.role !== 'member') { router.push('/auth/login'); return }
    setUser(session)

    const userId = session.userId
    const all = DB.get<Notification[]>('notifications') || []
    setNotifications(all.filter(n => n.userId === userId).reverse())
  }, [])

  const markAsRead = (id: string) => {
    const all = DB.get<Notification[]>('notifications') || []
    const updated = all.map(n => n.id === id ? { ...n, isRead: true } : n)
    DB.set('notifications', updated)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  const markAllRead = () => {
    const all = DB.get<Notification[]>('notifications') || []
    const updated = all.map(n => ({ ...n, isRead: true }))
    DB.set('notifications', updated)
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8F5E9]">Notifications</h1>
          <p className="text-sm text-[#8DA88D]">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs bg-[#1E2D12] text-[#B6E62E] px-4 py-2 rounded-lg hover:bg-[#2A3D18] transition">Mark All Read</button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="glass p-8 glow text-center">
            <p className="text-[#8DA88D]">No notifications.</p>
          </div>
        ) : notifications.map(n => (
          <div key={n.id} onClick={() => !n.isRead && markAsRead(n.id)}
            className={`glass p-4 glow cursor-pointer transition ${!n.isRead ? 'border-l-2 border-l-[#B6E62E]' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[#E8F5E9]">{n.title}</p>
                <p className="text-xs text-[#8DA88D] mt-1">{n.message}</p>
              </div>
              <div className="flex items-center gap-2">
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#B6E62E]" />}
                <span className="text-xs text-[#8DA88D]">{new Date(n.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
