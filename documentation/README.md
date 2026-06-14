# Jenga Wealth Management System

A self-contained, offline-first Savings and Credit Cooperative (SACCO) management system built as a single HTML file. Designed for village savings groups, SACCOs, cooperatives, and investment clubs in Uganda and East Africa.

## Quick Start

1. Open `index.html` in any modern browser (Chrome, Firefox, Edge recommended)
2. Log in with one of the demo credentials:
   - **Admin**: `admin` / `admin123`
   - **Treasurer**: `treasurer` / `treasurer123`
   - **Member**: `akankwasa` / `member123`
3. All data is stored in your browser's localStorage — no server or internet required

## Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full system oversight, user management, announcements, risk monitoring, financial reporting, chat with treasurer |
| **Treasurer** | Cash management, loan processing, member deposits, collections tracking, financial reports, chat with members and admin |
| **Member** | Personal savings, loan requests, contribution tracking, share ownership, group chat, announcements |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | HTML5, CSS3, JavaScript (ES6) |
| Styling | Custom CSS with CSS custom properties, glassmorphism, dark theme |
| Icons | Font Awesome 6.5.1 |
| Storage | Browser localStorage (JSON serialized) |
| Fonts | System font stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto) |
| Dependencies | None (zero external runtime dependencies) |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation.
See [DATA-MODEL.md](./DATA-MODEL.md) for entity relationship diagrams and data structures.
See [FEATURES.md](./FEATURES.md) for the complete feature inventory.
