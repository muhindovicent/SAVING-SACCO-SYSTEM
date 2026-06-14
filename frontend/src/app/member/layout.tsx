import DashboardShell from '@/components/Sidebar'

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
