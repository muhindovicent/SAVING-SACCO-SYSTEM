export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A1404] flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
