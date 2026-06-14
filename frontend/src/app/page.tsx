'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => { router.replace('/auth/login') }, [router])
  return (
    <div className="flex h-screen items-center justify-center bg-[#0A1404]">
      <div className="animate-spin h-8 w-8 border-2 border-[#B6E62E] border-t-transparent rounded-full" />
    </div>
  )
}
