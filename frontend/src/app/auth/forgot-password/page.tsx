'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  return (
    <div className="glass p-8 glow text-center">
      <h1 className="text-xl font-bold text-[#B6E62E] mb-4">Reset Password</h1>
      {!sent ? (
        <>
          <p className="text-[#8DA88D] mb-4 text-sm">Enter your email to receive reset instructions.</p>
          <input type="email" placeholder="you@example.com" className="w-full bg-[#1E2D12] border border-[#2A3D18] rounded-lg px-4 py-3 text-[#E8F5E9] placeholder-[#8DA88D] focus:outline-none focus:border-[#B6E62E] mb-4" />
          <button onClick={() => setSent(true)} className="w-full bg-[#B6E62E] text-[#0A1404] font-semibold py-3 rounded-lg hover:bg-[#9DCB1F] transition">Send Reset Link</button>
        </>
      ) : (
        <p className="text-[#B6E62E] text-sm">Check your email for reset instructions.</p>
      )}
      <Link href="/auth/login" className="block mt-4 text-[#B6E62E] hover:underline text-sm">Back to Login</Link>
    </div>
  )
}
