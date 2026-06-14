# Feature Inventory

## By Role

### Admin (5 tabs + 4 utility pages)

**Admin Dashboard** — Executive command center
| Tab | Features |
|-----|----------|
| **Overview** | Net assets, total/active/inactive members, total savings, shares capital, loan portfolio, cash available, monthly revenue, dividend reserve, snapshot grid (8 KPIs), system roles, quick actions |
| **Financial** | Financial health score, liquidity ratio, portfolio at risk (PAR), savings growth rate, loan growth rate, debt-to-asset ratio, loan recovery rate, return on assets (ROA), return on equity (ROE) — all with color-coded status indicators |
| **Members** | Membership overview, active rate, retention rate, new/dormant members, membership growth chart, full member list with active/inactive status |
| **Loans** | Pending/approved/rejected/paid/overdue/defaulted loan counts, top borrowers table, loan recovery performance metrics |
| **Risk** | Risk intelligence dashboard, overdue loan alerts, liquidity warnings, compliance status, large transaction alerts, risk indicator dots (critical/high/medium/low) |

**Admin Utility Pages**
- **My Savings**: Personal savings account (deposit, view history)
- **My Loans**: Personal loan account (request loans, view history)
- **User Management**: CRUD operations — add, edit, delete users (all roles)
- **Announcements**: Post, view, and delete system-wide announcements
- **Treasurer Hotline**: Private 1-on-1 chat with any treasurer

### Treasurer (3 tabs + 6 utility pages)

**Treasurer Dashboard** — Operations center
| Tab | Features |
|-----|----------|
| **Overview** | Cash position, total deposits, active loans, repayments, cash available, pending disbursements, due contributions count, today's transaction count, overdue loans count, quick actions |
| **Collections** | Per-member collection tracking, paid/pending status for current month, collection rate %, due today count, member-level drill-down with totals and last deposit dates |
| **Stream** | Real-time (auto-refreshing) transaction feed showing deposits, loan issues, and loan payments with member names, amounts, timestamps, and processor names |

**Treasurer Utility Pages**
- **My Savings**: Personal savings account
- **My Loans**: Personal loan account (request loans)
- **General Ledger**: Aggregate financial position (balance, deposits, loans, repayments)
- **Transactions**: Record member savings deposits
- **Loan Management**: 3 tabs — All Loans (view + detail expand), Approve New (pending requests + manual approval), Record Payment (log loan repayments)
- **Member Reports**: Generate per-member reports showing savings history, loan history, and full transaction ledger with running balance
- **Messages**: Chat with admins and members (auto-refresh every 10s)

### Member (1 dashboard + 4 utility pages)

**Member Dashboard** — Digital banking experience
| Section | Features |
|---------|----------|
| **Hero Card** | Total savings with growth %, loan limit, share value, loan balance |
| **Metric Cards** | Total savings, shares owned (+ value), loan balance, interest earned |
| **Loan Eligibility** | Circular progress showing eligibility %, max loan amount (3x savings), Apply Now button |
| **Active Loan** | Principal, outstanding balance, due date, repayment progress bar (shown only if active loan exists) |
| **Contribution Tracker** | Circular progress showing annual contribution %, amount contributed vs required, on-track/pending badge |
| **Recent Transactions** | Last 5 transactions with type badge, amount, date |
| **Savings Growth** | Animated bar chart (12 bars representing monthly trends) |
| **Quick Actions** | Deposit, Loan, Repay, Contact |
| **Announcements** | Latest 2 system announcements |

**Member Utility Pages**
- **My Savings**: Deposit savings, view total/summary, deposit history table
- **My Loans**: Request loan (pending → treasurer approval), view outstanding balance, loan history table with status badges
- **Announcements**: View all system announcements
- **Group Chat**: Group messaging with all members, private chat with treasurer

## Cross-Cutting Features

### Authentication & Security
- Role-based access control (admin/treasurer/member)
- Route protection — unauthorized pages redirect to login
- Session management via `currentUser` variable (cleared on logout)
- Delete self-prevention (admin cannot delete own account)

### Chat System
- Group chat (all members)
- Private 1-on-1 direct messages
- Auto-refresh every 10 seconds with input preservation (typed message is not lost)
- Admin can chat with any treasurer; treasurer can chat with any admin or member

### Loan Lifecycle
```
Member Request (pending)
    → Treasurer Approve (active)
        → Member Repays (payments recorded)
            → Fully Paid (paid)
    → Treasurer Reject (rejected)
```

### Savings & Transactions
- Deposits create both a `savings` record and a `transactions` record
- Loan issues and payments also generate `transactions` records
- All transactions form a complete audit trail with `created_by` tracking

### Responsive UI
- **Mobile** (< 768px): Bottom tab navigation with central action button, single-column layout
- **Desktop** (≥ 768px): Sidebar navigation with user info panel, multi-column grids
- Dark theme throughout with green accent palette (#B6E62E)
- Glassmorphism cards, progress bars, circular progress indicators
- Print-friendly (`.no-print` class hides navigation during printing)

### Data Persistence
- All data stored in browser localStorage
- No server, no database, no internet required
- Data survives browser restart and page refresh
- Clearing localStorage resets to seed data
- `sacco_shares` key is force-initialized on every load for upgrade safety

## Complete Route Map

| Route | View | Rendered By |
|-------|------|-------------|
| `login` | Login page | `renderLogin()` |
| `member` | Member dashboard | `renderMemberDashboard()` |
| `member-savings` | Member savings | `renderMemberSavings()` |
| `member-loans` | Member loans | `renderMemberLoans()` |
| `member-announcements` | Announcements | `renderMemberAnnouncements()` |
| `member-chat` | Member chat | `renderMemberChat()` |
| `treasurer` | Treasurer dashboard | `renderTreasurerDashboard()` |
| `treasurer-savings` | Treasurer savings | `renderMemberSavings()` |
| `treasurer-loans` | Loan management | `renderTreasurerLoans()` |
| `treasurer-ledger` | General ledger | `renderTreasurerLedger()` |
| `treasurer-transactions` | Record transaction | `renderTreasurerTransactions()` |
| `treasurer-reports` | Member reports | `renderTreasurerReports()` |
| `treasurer-chat` | Treasurer messages | `renderTreasurerChat()` |
| `admin` | Admin dashboard | `renderAdminDashboard()` |
| `admin-savings` | Admin savings | `renderMemberSavings()` |
| `admin-loans` | Admin loans | `renderMemberLoans()` |
| `admin-users` | User management | `renderAdminUsers()` |
| `admin-announcements` | Announcements | `renderAdminAnnouncements()` |
| `admin-chat` | Treasurer hotline | `renderAdminChat()` |
