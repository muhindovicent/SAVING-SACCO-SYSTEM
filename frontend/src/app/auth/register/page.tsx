'use client'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="glass p-8 glow text-center">
      <h1 className="text-xl font-bold text-[#B6E62E] mb-4">Member Registration</h1>
      <p className="text-[#8DA88D] mb-6">Registration is currently handled by the admin. Please contact the SACCO office.</p>
      <Link href="/auth/login" className="text-[#B6E62E] hover:underline text-sm">Back to Login</Link>
    </div>
  )
}
