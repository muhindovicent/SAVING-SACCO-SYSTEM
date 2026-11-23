import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth'

export async function POST(): Promise<NextResponse> {
  clearAuthCookies()
  return NextResponse.json({ message: 'Logged out successfully' })
}