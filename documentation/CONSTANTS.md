# System Constants & Configuration

## Financial Constants

| Constant | Value | Description |
|----------|-------|-------------|
| Share Price | UGX 10,000 | Price per share unit |
| Interest Rate | 5% per month | Default loan interest rate |
| Loan Multiplier | 3x savings | Maximum loan eligibility (3 × total savings) |
| Monthly Contribution | UGX 50,000 | Default required monthly savings |
| Interest Earned Rate | 2.8% | Annual interest credited to member savings |
| Dividend Reserve | 5% | Percentage of deposits set aside for dividends |
| Minimum Deposit | UGX 1,000 | Minimum savings deposit amount |
| Minimum Loan | UGX 1,000 | Minimum loan request amount |

## localStorage Keys

| Key | Entity | Seed Data |
|-----|--------|-----------|
| `sacco_initialized` | Flag | `true` after first seed |
| `sacco_users` | Users | 21 users (1 admin, 1 treasurer, 19 members) |
| `sacco_savings` | Savings | ~57 deposits (3 per member) |
| `sacco_loans` | Loans | ~6 active loans |
| `sacco_shares` | Shares | Empty (no seed shares) |
| `sacco_transactions` | Transactions | ~63 records |
| `sacco_messages` | Messages | 5 seed messages |
| `sacco_announcements` | Announcements | 3 announcements |
| `sacco_generalLedger` | Ledger | Single record |

## Seed Users

| Username | Password | Role | Name |
|----------|----------|------|------|
| admin | admin123 | admin | System Admin |
| treasurer | treasurer123 | treasurer | Grace Treasurer |
| akankwasa | member123 | member | Akankwasa Dennis |
| nambi | member123 | member | Nambi Grace |
| ssali | member123 | member | Ssali Patrick |
| nakato | member123 | member | Nakato Sarah |
| lubega | member123 | member | Lubega John |
| nalwoga | member123 | member | Nalwoga Esther |
| mutebi | member123 | member | Mutebi Joseph |
| nakimuli | member123 | member | Nakimuli Ruth |
| kato | member123 | member | Kato Peter |
| babirye | member123 | member | Babirye Faith |
| ssenoga | member123 | member | Ssenoga David |
| nabatanzi | member123 | member | Nabatanzi Alice |
| mukasa | member123 | member | Mukasa Robert |
| nanyonjo | member123 | member | Nanyonjo Joan |
| kiwanuka | member123 | member | Kiwanuka Sam |
| nabirye | member123 | member | Nabirye Sarah |
| wasswa | member123 | member | Wasswa Henry |
| nankya | member123 | member | Nankya Robinah |
| lule | member123 | member | Lule Isaac |

## Roles & Access Control

| Page | admin | treasurer | member |
|------|-------|-----------|--------|
| Login | ✓ | ✓ | ✓ |
| Dashboard (role-based) | Admin | Treasurer | Member |
| My Savings | ✓ | ✓ | ✓ |
| My Loans | ✓ | ✓ | ✓ |
| Announcements | ✓ | ✗ | ✓ |
| Chat (Group/Member) | ✗ | ✓ | ✓ |
| Admin Chat (Hotline) | ✓ | ✗ | ✗ |
| Treasurer Chat | ✗ | ✓ | ✗ |
| User Management | ✓ | ✗ | ✗ |
| Loan Management | ✗ | ✓ | ✗ |
| Transactions (Record) | ✗ | ✓ | ✗ |
| Reports | ✗ | ✓ | ✗ |
| General Ledger | ✗ | ✓ | ✗ |

## Technical Constants

| Constant | Value | Description |
|----------|-------|-------------|
| Chat Refresh | 10,000 ms | Auto-refresh interval for chat views |
| Message Max Length | 500 chars | Maximum message length |
| Loan Statuses | pending → active → paid | Lifecycle states |
| Rejected Status | rejected | Can be set from pending |
| Storage Prefix | `sacco_` | Prefix for all localStorage keys |
| ID Strategy | Auto-increment | `Math.max(...ids) + 1` |
| Date Format | `dd MMM yyyy` | e.g., 14 Jun 2026 |
| Time Format | `HH:MM` | 24-hour format |
| Currency | UGX | Uganda Shillings, no decimals |
| CSS Primary Color | #B6E62E | Green accent |
| CSS Background | #0A1404 | Dark background |
| Minimum Desktop Width | 768px | Breakpoint for sidebar layout |

## File Size

| Metric | Value |
|--------|-------|
| Total Lines | ~1,550 |
| CSS Lines | ~340 |
| JS Lines | ~1,170 |
| HTML Lines | ~40 (structure) |
| File Size | ~45-50 KB |
