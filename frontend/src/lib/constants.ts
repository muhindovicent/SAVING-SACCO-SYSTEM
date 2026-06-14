export const APP_NAME = 'Jenga Wealth'
export const SAVINGS_INTEREST_RATE = 2.5
export const LOAN_INTEREST_RATE = 12
export const SHARE_UNIT_PRICE = 1000
export const DB_PREFIX = 'sacco_'
export const AUTH_KEY = 'sacco_auth_user'

export const NAV_ITEMS = {
  admin: [
    { label: 'Dashboard', icon: 'LayoutDashboard', href: '/admin/dashboard' },
    { label: 'Members', icon: 'Users', href: '/admin/members' },
    { label: 'Savings', icon: 'Wallet', href: '/admin/savings' },
    { label: 'Loans', icon: 'Landmark', href: '/admin/loans' },
    { label: 'Reports', icon: 'BarChart3', href: '/admin/reports' },
    { label: 'Treasury', icon: 'Briefcase', href: '/admin/treasury' },
    { label: 'Governance', icon: 'Building2', href: '/admin/governance' },
    { label: 'Settings', icon: 'Settings', href: '/admin/settings' },
  ],
  treasurer: [
    { label: 'Dashboard', icon: 'LayoutDashboard', href: '/treasurer/dashboard' },
    { label: 'Collections', icon: 'ArrowDownToLine', href: '/treasurer/collections' },
    { label: 'Approvals', icon: 'ClipboardCheck', href: '/treasurer/approvals' },
    { label: 'Contributions', icon: 'HandCoins', href: '/treasurer/contributions' },
    { label: 'Reports', icon: 'BarChart3', href: '/treasurer/reports' },
  ],
  member: [
    { label: 'Dashboard', icon: 'LayoutDashboard', href: '/member/dashboard' },
    { label: 'Savings', icon: 'Wallet', href: '/member/savings' },
    { label: 'Loans', icon: 'Landmark', href: '/member/loans' },
    { label: 'Payments', icon: 'ArrowRightLeft', href: '/member/payments' },
    { label: 'Shares', icon: 'PieChart', href: '/member/shares' },
    { label: 'Profile', icon: 'UserCircle', href: '/member/profile' },
    { label: 'Notifications', icon: 'Bell', href: '/member/notifications' },
  ],
} as const
