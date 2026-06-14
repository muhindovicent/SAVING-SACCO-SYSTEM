import DashboardShell from '@/components/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
