# Jenga Wealth Database

PostgreSQL 17 database for Jenga Wealth SACCO management system.

## Contents

- `docker-compose.yml` — PostgreSQL 17 + Redis 7 + RabbitMQ 3.13
- `.env` — Database connection variables
- `migrations/init.sql` — Full schema with 30+ tables, indexes, enums, and seed data

## Quick Start

```bash
docker compose up -d
```

## Connection

- Host: localhost:5432
- Database: jenga_wealth
- User: sacco_user
- Password: Sacco@2024!

## Schema

30+ tables covering: Users, Members, Savings, Loans, Shares, Contributions, Payments, Penalties, Accounting (double-entry), Governance (meetings, voting), Notifications, Documents, Audit, Settings.

## Seed Data

- admin@jengawealth.com / Admin@123 (admin)
- treasurer@jengawealth.com / Admin@123 (treasurer)
- john@jengawealth.com / Member@123 (member)
- jane@jengawealth.com / Member@123 (member)
- peter@jengawealth.com / Member@123 (member)
