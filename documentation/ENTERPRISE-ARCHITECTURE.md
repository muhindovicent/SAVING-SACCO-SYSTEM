# Jenga Wealth — Enterprise Architecture Blueprint

> **Classification**: Confidential | **Version**: 1.0.0 | **Target Scale**: 2M+ members, 10K+ TPS, 99.99% uptime

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Microservices Design](#2-microservices-design)
3. [Database Architecture](#3-database-architecture)
4. [PostgreSQL Schema Design](#4-postgresql-schema-design)
5. [Message Broker & Event Design (Kafka)](#5-message-broker--event-design-kafka)
6. [Caching Strategy (Redis)](#6-caching-strategy-redis)
7. [Search Strategy (Elasticsearch)](#7-search-strategy-elasticsearch)
8. [Kubernetes Infrastructure](#8-kubernetes-infrastructure)
9. [Security Blueprint](#9-security-blueprint)
10. [API Specifications](#10-api-specifications)
11. [Observability & Monitoring Architecture](#11-observability--monitoring-architecture)
12. [Disaster Recovery Plan](#12-disaster-recovery-plan)
13. [Scalability Blueprint](#13-scalability-blueprint)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
                         ┌──────────────────┐
                         │   CDN / Cloudflare│
                         │   (DDOS, WAF, SSL)│
                         └────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │   Kong API Gateway│
                         │ (Rate Limit, Auth,│
                         │  Load Balance,    │
                         │  Request Validate)│
                         └────────┬─────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   Auth Service   │   │  Member Service  │   │  Savings Service │
│  (NestJS, JWT,   │   │  (NestJS, CQRS)  │   │  (NestJS, CQRS)  │
│   OAuth 2.1)     │   │                  │   │                  │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │                      │                      │
          ───────────┬───────────┬─────────────────────┐
                     ▼           ▼                     ▼
          ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
          │  Loan Service   │   │  Treasury Service│   │ Accounting Svc   │
          │  (NestJS, CQRS) │   │  (NestJS, CQRS)  │   │  (Immutable      │
          │                 │   │                  │   │   Ledger, CQRS)   │
          └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
                    ───────────┬───────────┬──────────────────────┘
                               ▼           ▼
                    ┌──────────────────┐   ┌──────────────────┐
                    │ Notification Svc │   │  Audit Service   │
                    │  (NestJS,        │   │  (NestJS,        │
                    │   Email, SMS,    │   │   Immutable Logs)│
                    │   Push)          │   │                  │
                    └────────┬─────────┘   └────────┬─────────┘
                              ───────────┬───────────┘
                                         ▼
                              ┌──────────────────┐
                              │  Risk & Fraud    │
                              │  Detection Svc   │
                              │  (ML, Rules Eng) │
                              └──────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
           ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
           │  PostgreSQL  │   │  Kafka       │   │  Redis       │
           │  (Write      │   │  (Events,    │   │  (Cache,     │
           │   Cluster)   │   │   Streams)   │   │   Sessions)  │
           └──────────────┘   └──────────────┘   └──────────────┘
                    │
                    ▼
           ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
           │  PostgreSQL  │   │  ClickHouse  │   │Elasticsearch │
           │  (Read       │   │  (Analytics, │   │  (Search,    │
           │   Replicas)  │   │   Data Wareh.)│   │   Logs)      │
           └──────────────┘   └──────────────┘   └──────────────┘
```

### 1.2 Architecture Principles

| Principle | Implementation |
|-----------|---------------|
| **Microservices** | Each bounded context is an independently deployable NestJS service |
| **Event-Driven** | Kafka as the backbone for all cross-service communication |
| **CQRS** | Separate read/write models; reads hit replicas, writes hit primaries |
| **DDD** | Each service owns its domain data; no cross-service DB access |
| **Hexagonal** | Ports & adapters pattern: use cases live at the centre, I/O at the edges |
| **Immutable Ledger** | Double-entry accounting — no `UPDATE` on balances, always `INSERT` |
| **Idempotency** | Every write carries an idempotency key for at-most-once semantics |

### 1.3 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, TypeScript, Tailwind, ShadCN UI | PWA, SSR, offline support |
| **API Gateway** | Kong Gateway + NGINX | Rate limiting, auth, routing |
| **Backend** | NestJS, TypeScript | All microservices |
| **Primary DB** | PostgreSQL 17 (Patroni cluster) | ACID transactions, core data |
| **Cache** | Redis 7 Cluster | Sub-100ms reads, sessions, rate limits |
| **Message Broker** | Apache Kafka 3.6 | Event streaming, async processing |
| **Search** | Elasticsearch 8 | Full-text search across members, transactions, logs |
| **Data Warehouse** | ClickHouse | Analytics, BI, historical reporting |
| **Orchestration** | Kubernetes (EKS/AKS/GKE) | Container orchestration, auto-scaling |
| **Observability** | Prometheus + Grafana + OpenTelemetry + ELK | Metrics, traces, logs |
| **CI/CD** | GitLab CI / GitHub Actions + ArgoCD | GitOps deployment |

---

## 2. Microservices Design

### 2.1 Service Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Kong)                          │
│  /api/v1/auth/*  /api/v1/members/*  /api/v1/savings/*  ...     │
└──────┬──────────────┬──────────────┬──────────────┬────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Auth    │  │ Members  │  │ Savings  │  │  Loans   │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │Treasury  │  │Accountng│  │ Notify   │  │  Audit   │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Reports  │  │Governance│  │ Risk/Fraud│
  └──────────┘  └──────────┘  └──────────┘
```

### 2.2 Service Specifications

#### 2.2.1 Authentication Service

| Attribute | Detail |
|-----------|--------|
| **Language** | NestJS, TypeScript |
| **DB** | PostgreSQL (dedicated schema: `auth`) |
| **Cache** | Redis (sessions, OTPs, rate limits) |
| **Auth Protocol** | OAuth 2.1 + OpenID Connect |
| **Token** | JWT (access: 15m, refresh: 7d) |
| **Password** | Argon2id |
| **MFA** | TOTP (RFC 6238), SMS, Email |
| **Device** | Fingerprinting, trusted device tracking |
| **Events Published** | `user.login`, `user.logout`, `user.mfa_enabled`, `user.password_changed`, `user.locked` |

#### 2.2.2 Member Service

| Attribute | Detail |
|-----------|--------|
| **DB** | PostgreSQL (schema: `members`) |
| **Search** | Elasticsearch (member index) |
| **KYC** | Document upload, verification workflow, ID verification |
| **Events** | `member.created`, `member.kyc_verified`, `member.updated`, `member.status_changed` |
| **Key Constraints** | Unique member number, unique username, unique email, soft deletes only |

#### 2.2.3 Savings Service

| Attribute | Detail |
|-----------|--------|
| **DB** | PostgreSQL (schema: `savings`) |
| **Products** | Multiple product types (regular, fixed deposit, goal-based) with configurable rates |
| **Operations** | Deposit, withdrawal, transfer, interest accrual, auto-save |
| **Events** | `savings.deposited`, `savings.withdrawn`, `savings.interest_posted`, `savings.goal_achieved` |
| **Accounting** | Every operation generates a double-entry journal entry via Accounting Service |

#### 2.2.4 Loan Service

| Attribute | Detail |
|-----------|--------|
| **DB** | PostgreSQL (schema: `loans`) |
| **Products** | Configurable loan products (interest method, period, collateral requirements) |
| **Lifecycle** | Application → Approval → Disbursement → Repayment → Closure / Write-off |
| **Scoring** | Credit scoring via risk service; automated approval for low-risk |
| **Events** | `loan.applied`, `loan.approved`, `loan.rejected`, `loan.disbursed`, `loan.repaid`, `loan.defaulted` |

#### 2.2.5 Accounting Service

| Attribute | Detail |
|-----------|--------|
| **DB** | PostgreSQL (schema: `accounting`) |
| **Core** | Double-entry engine — immutable journal entries |
| **Chart of Accounts** | Configurable multi-level chart of accounts |
| **Financial Periods** | Monthly periods with open/close lifecycle |
| **Reports** | Trial balance, income statement, balance sheet, general ledger |
| **Events** | `accounting.journal_posted`, `accounting.period_closed`, `accounting.report_generated` |

#### 2.2.6 Notification Service

| Attribute | Detail |
|-----------|--------|
| **Channels** | Email (SendGrid/Mailgun), SMS (Twilio/Africa's Talking), Push (Firebase), In-App |
| **Templates** | Configurable template engine per channel |
| **Queue** | Kafka consumer group — async delivery |
| **Events Consumed** | All domain events requiring member notification |

#### 2.2.7 Risk & Fraud Detection Service

| Attribute | Detail |
|-----------|--------|
| **Engine** | Rule-based (Drools-like) + ML models (Python microservice, ONNX runtime) |
| **Detection** | Rapid withdrawals, duplicate accounts, unusual patterns, money laundering |
| **Action** | Flag, hold, alert, block transaction |
| **Events Published** | `fraud.alert`, `risk.score_updated`, `transaction.flagged` |

### 2.3 Inter-Service Communication

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│ Service A│──REST──▶│ Service B│──REST──▶│ Service C│
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │         ┌──────────▼──────────┐         │
     └────────▶│   Apache Kafka      │◄────────┘
               │   (Event Bus)       │
               └──────────┬──────────┘
                          │
                    ┌─────▼─────┐
                    │  Service  │
                    │  D, E, F  │
                    └───────────┘
```

- **Synchronous**: REST/gRPC for queries and commands that need immediate response
- **Asynchronous**: Kafka events for all cross-service side effects
- **Idempotency**: Every event carries `idempotency_key` for safe replay

### 2.4 Service Template (NestJS)

```
src/
├── application/
│   ├── commands/          # CQRS command handlers
│   ├── queries/           # CQRS query handlers
│   ├── use-cases/         # Orchestration of domain logic
│   └── dto/               # Request/response DTOs
├── domain/
│   ├── entities/          # Domain entities with business rules
│   ├── value-objects/     # Immutable value objects
│   ├── events/            # Domain events
│   ├── repositories/      # Repository interfaces (ports)
│   └── services/          # Domain services
├── infrastructure/
│   ├── persistence/       # Repository implementations (adapters)
│   │   ├── prisma/        # Prisma schema & repositories
│   │   └── cache/         # Redis cache adapters
│   ├── messaging/         # Kafka producers/consumers
│   ├── search/            # Elasticsearch adapters
│   └── http/              # External API clients
├── interfaces/
│   ├── http/              # REST controllers
│   ├── graphql/           # GraphQL resolvers (if needed)
│   └── grpc/              # gRPC service definitions
├── config/                # Environment configuration
├── common/                # Shared utilities, guards, interceptors
├── module.ts              # NestJS module
└── main.ts                # Entry point
```

---

## 3. Database Architecture

### 3.1 PostgreSQL Cluster Topology

```
                    ┌─────────────────────┐
                    │   Application       │
                    │   (via PgBouncer)   │
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
     ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
     │  PgBouncer  │   │  PgBouncer  │   │  PgBouncer  │
     │  (Write)    │   │  (Read)     │   │  (Read)     │
     └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
            │                  │                  │
     ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
     │  Patroni    │   │  Patroni    │   │  Patroni    │
     │  Leader     │──▶│  Replica 1  │   │  Replica 2  │
     │  (Primary)  │   └─────────────┘   └─────────────┘
     └──────┬──────┘
            │
     ┌──────▼──────┐
     │  Synchro-   │
     │  nous       │
     │  Standby    │
     └─────────────┘
```

### 3.2 Sharding Strategy

Shard key: `member_id % number_of_shards`

| Shard | Range | Region | Physical Host |
|-------|-------|--------|---------------|
| Shard 0 | id % 4 = 0 | Central | pg-cluster-0 |
| Shard 1 | id % 4 = 1 | North | pg-cluster-1 |
| Shard 2 | id % 4 = 2 | East | pg-cluster-2 |
| Shard 3 | id % 4 = 3 | West | pg-cluster-3 |

Using **Citus** extension for distributed PostgreSQL with intelligent query routing.

### 3.3 Table Partitioning

All large tables use **declarative partitioning**:

```sql
CREATE TABLE transactions (
    id              UUID,
    member_id       UUID NOT NULL,
    type            transaction_type NOT NULL,
    amount          DECIMAL(15,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE transactions_2026_01
    PARTITION OF transactions
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE transactions_2026_02
    PARTITION OF transactions
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

Partitioned tables:
- `transactions` — monthly by `created_at`
- `journal_entries` — monthly by `entry_date`
- `journal_lines` — monthly referencing parent entry date
- `audit_logs` — monthly by `created_at`
- `loan_repayments` — monthly by `paid_at`
- `savings_transactions` — monthly by `created_at`

### 3.4 Read/Write Splitting

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   CQRS       │     │   CQRS       │     │   CQRS       │
│   Command    │     │   Query 1    │     │   Query 2    │
│   (Primary)  │     │(Read Replica)│     │(Read Replica)│
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │     ┌──────────────┴──────────────┐     │
       │     │   PgBouncer (Read)          │     │
       │     │   Auto-routes to replicas   │     │
       │     └──────────────┬──────────────┘     │
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  PostgreSQL  │     │  PostgreSQL  │     │  PostgreSQL  │
│  Primary     │◄────│  Replica 1   │     │  Replica 2   │
│  (Write)     │     │  (Read-only) │     │  (Read-only) │
└──────────────┘     └──────────────┘     └──────────────┘
```

- All `INSERT`, `UPDATE`, `DELETE` → Primary
- All `SELECT` for dashboards, reports, search → Read Replicas
- Synchronous replication for zero data loss

### 3.5 Data Warehouse (ClickHouse)

```
┌──────────────┐     ┌──────────────┐
│  PostgreSQL  │     │  PostgreSQL  │
│  Primary     │     │  Replicas    │
└──────┬───────┘     └──────┬───────┘
       │                    │
       └──────────┬─────────┘
                  │
          ┌───────▼───────┐
          │  Kafka        │
          │  (CDC via     │
          │  Debezium)    │
          └───────┬───────┘
                  │
          ┌───────▼───────┐
          │  ClickHouse   │
          │  (Columnar    │
          │   Analytics)  │
          └───────┬───────┘
                  │
          ┌───────▼───────┐
          │  Grafana      │
          │  BI Tools     │
          │  Superset     │
          └───────────────┘
```

- Real-time CDC via Debezium (Kafka Connect) from PostgreSQL to ClickHouse
- All analytical and reporting queries hit ClickHouse, never the operational DB
- Aggregated materialized views for common report queries

### 3.6 PostgreSQL Configuration

```ini
# postgresql.conf — Performance tuned for 2M+ members
max_connections = 500
shared_buffers = 16GB
effective_cache_size = 48GB
maintenance_work_mem = 2GB
checkpoint_completion_target = 0.9
wal_buffers = 64MB
default_statistics_target = 500
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 64MB
min_wal_size = 4GB
max_wal_size = 16GB
max_worker_processes = 16
max_parallel_workers_per_gather = 8
max_parallel_workers = 16
max_parallel_maintenance_workers = 4
```

---

## 4. PostgreSQL Schema Design

### 4.1 Schema per Service

```
jenga_wealth
├── auth                    # User identities, credentials, sessions
├── members                 # Member profiles, KYC, documents
├── savings                 # Savings products, accounts, transactions, goals
├── loans                   # Loan products, applications, loans, schedules, repayments
├── treasury                # Cash accounts, reconciliations
├── accounting              # Chart of accounts, journal entries, financial periods
├── audit                   # Audit logs, system events
├── governance              # Meetings, resolutions, votes
├── notifications           # Notification templates, delivery logs
├── risk                    # Risk scores, fraud alerts, blacklists
└── system_config           # Configuration, feature flags, constants
```

### 4.2 Key Indexing Strategy

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_transactions_member_date
    ON transactions (member_id, created_at DESC)
    WHERE is_deleted = FALSE;

CREATE INDEX idx_loans_member_status
    ON loans (member_id, status)
    WHERE is_deleted = FALSE;

CREATE INDEX idx_journal_entries_date_source
    ON journal_entries (entry_date DESC, ref_type)
    WHERE is_posted = TRUE;

-- Partial indexes for high-frequency queries
CREATE INDEX idx_active_loans_due_today
    ON loans (member_id)
    WHERE status IN ('ACTIVE', 'OVERDUE')
      AND next_due_date = CURRENT_DATE;

-- Covering indexes for report queries
CREATE INDEX idx_savings_balance_report
    ON savings_accounts (member_id) INCLUDE (balance, available_balance, status);

-- Full-text search indexes
CREATE INDEX idx_members_fulltext
    ON members USING GIN (
        to_tsvector('english', full_name || ' ' || member_number || ' ' || COALESCE(phone_primary, ''))
    );
```

### 4.3 Archival Strategy

- **Active**: Current + 2 years (partitioned by month)
- **Warm**: 2–7 years (compressed, separate tablespace on slower storage)
- **Cold**: > 7 years (exported to Parquet, stored in S3 Glacier, queryable via ClickHouse)
- Automatic archival via `pg_cron` scheduled jobs

---

## 5. Message Broker & Event Design (Kafka)

### 5.1 Cluster Topology

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Kafka       │  │  Kafka       │  │  Kafka       │
│  Broker 1    │  │  Broker 2    │  │  Broker 3    │
│  (Controller)│  │              │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                    ┌─────▼─────┐
                    │  Zookeeper│
                    │  (3-node) │
                    └───────────┘
```

- **3 Brokers** (minimum production)
- **Replication Factor**: 3 for critical topics, 2 for operational topics
- **Partitions**: 12–24 per topic (based on throughput requirements)
- **Retention**: 7 days for transactional topics, 30 days for audit topics

### 5.2 Topic Design

| Topic | Partitions | Retention | Key | Schema |
|-------|-----------|-----------|-----|--------|
| `user.events` | 12 | 7d | `user_id` | Avro |
| `member.events` | 12 | 7d | `member_id` | Avro |
| `savings.events` | 24 | 7d | `account_id` | Avro |
| `savings.transactions` | 24 | 30d | `account_id` | Avro |
| `loan.events` | 12 | 7d | `loan_id` | Avro |
| `loan.repayments` | 12 | 30d | `loan_id` | Avro |
| `accounting.journals` | 24 | 7d | `period_id` | Avro |
| `notifications.email` | 6 | 3d | `user_id` | Avro |
| `notifications.sms` | 6 | 3d | `phone` | Avro |
| `notifications.push` | 6 | 1d | `device_id` | Avro |
| `audit.logs` | 12 | 30d | `entity_id` | Avro |
| `fraud.alerts` | 6 | 7d | `member_id` | Avro |
| `reporting.aggregates` | 6 | 1d | `report_type` | Avro |

### 5.3 Event Schema (Avro Example)

```avro
{
  "namespace": "com.jenga.wealth.savings",
  "type": "record",
  "name": "DepositEvent",
  "fields": [
    {"name": "event_id",          "type": "string",  "doc": "UUID"},
    {"name": "idempotency_key",   "type": "string",  "doc": "Idempotency key for dedup"},
    {"name": "account_id",        "type": "string"},
    {"name": "member_id",         "type": "string"},
    {"name": "amount",            "type": "double"},
    {"name": "currency",          "type": "string",  "default": "UGX"},
    {"name": "balance_before",    "type": "double"},
    {"name": "balance_after",     "type": "double"},
    {"name": "reference",         "type": "string"},
    {"name": "timestamp",         "type": "long",    "logicalType": "timestamp-millis"},
    {"name": "producer",          "type": "string",  "default": "savings-service"}
  ]
}
```

### 5.4 Consumer Groups

| Consumer Group | Services | Topics Consumed |
|---------------|----------|-----------------|
| `accounting-worker` | Accounting Service | `savings.transactions`, `loan.repayments`, `loan.events` |
| `notification-worker` | Notification Service | `savings.events`, `loan.events`, `user.events` |
| `fraud-worker` | Risk Service | `savings.transactions`, `loan.repayments`, `user.events` |
| `audit-worker` | Audit Service | `*.events`, `*.transactions` |
| `reporting-worker` | Reporting Service | `savings.transactions`, `loan.repayments`, `accounting.journals` |

### 5.5 Dead Letter Queue (DLQ)

Each consumer group has a `-dlq` suffix topic for failed messages:
- Maximum 3 retries with exponential backoff
- After exhaustion, message moves to DLQ
- DLQ monitored via alerting; manual or automated replay

---

## 6. Caching Strategy (Redis)

### 6.1 Cluster Topology

```
         ┌─────────────────────────────────┐
         │        Redis Cluster            │
         │  (6 nodes: 3 masters, 3 slaves) │
         │                                 │
         │  Master 1 ── Slave 1            │
         │  Master 2 ── Slave 2            │
         │  Master 3 ── Slave 3            │
         └─────────────────────────────────┘
```

### 6.2 Cache Layers

| Layer | Type | TTL | Data | Hit Target |
|-------|------|-----|------|-----------|
| L1 | In-memory (Node.js) | 30s | Hot dashboard data, member profile | < 5ms |
| L2 | Redis Cluster | 5m | Aggregates, loan eligibility, product config | < 50ms |
| L3 | PostgreSQL | N/A | Source of truth | < 200ms |

### 6.3 Cache Key Schema

```
# Session
session:{user_id}:{token_hash} → {session_data} [TTL: 15m]

# Rate Limiting
ratelimit:{ip}:{endpoint} → {count} [TTL: 60s]

# Dashboard Aggregates
dashboard:member:{member_id}:summary → JSON [TTL: 5m]
dashboard:treasurer:overview → JSON [TTL: 2m]
dashboard:admin:overview → JSON [TTL: 2m]

# Member
member:{member_id}:profile → JSON [TTL: 10m]
member:{member_id}:savings → JSON [TTL: 5m]
member:{member_id}:loans → JSON [TTL: 5m]

# Loan Eligibility
loan:eligibility:{member_id}:{product_id} → JSON [TTL: 1h]

# Products
products:savings → JSON [TTL: 1h]
products:loans → JSON [TTL: 1h]

# OTP
otp:{identifier} → {otp_code} [TTL: 5m]

# Password Reset
reset:{token} → {user_id} [TTL: 1h]

# Idempotency
idempotency:{key} → {result} [TTL: 24h]
```

### 6.4 Cache Invalidation Strategy

- **Write-Through**: On any data mutation, invalidate related cache keys
- **Pub/Sub Invalidation**: Redis Pub/Sub channels for cross-instance invalidation
- **TTL-based**: All cached items have a TTL; staleness is bounded
- **Pattern Invalidation**: `KEYS dashboard:member:{member_id}:*` → `DEL` on member data change

### 6.5 Rate Limiting

```
IP-based:     60 req/min per endpoint
User-based:   300 req/min per user
Endpoint:     10 req/s for write endpoints
              100 req/s for read endpoints
Login:        5 attempts per IP per minute
```

---

## 7. Search Strategy (Elasticsearch)

### 7.1 Cluster Topology

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  ES Master   │  │  ES Data 1   │  │  ES Data 2   │
│  (3 nodes)   │  │  (Hot tier)  │  │  (Hot tier)  │
└──────────────┘  └──────────────┘  └──────────────┘
                   ┌──────────────┐  ┌──────────────┐
                   │  ES Data 3   │  │  ES Data 4   │
                   │  (Warm tier) │  │  (Cold tier) │
                   └──────────────┘  └──────────────┘
```

### 7.2 Index Design

| Index | Shards | Replicas | Documents | Refresh Interval |
|-------|--------|----------|-----------|-----------------|
| `members` | 6 | 2 | ~2M | 30s |
| `transactions` | 24 | 2 | ~500M | 60s |
| `loans` | 6 | 2 | ~5M | 30s |
| `audit_logs` | 12 | 2 | ~1B | 60s |
| `savings_accounts` | 6 | 2 | ~4M | 30s |

### 7.3 Index Mapping (Members)

```json
{
  "index": "members",
  "settings": {
    "number_of_shards": 6,
    "number_of_replicas": 2,
    "analysis": {
      "analyzer": {
        "sacco_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "edge_ngram"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "member_number": { "type": "keyword" },
      "full_name": { "type": "text", "analyzer": "sacco_analyzer" },
      "phone_primary": { "type": "keyword" },
      "email": { "type": "keyword" },
      "status": { "type": "keyword" },
      "kyc_status": { "type": "keyword" },
      "date_joined": { "type": "date" },
      "savings_balance": { "type": "double" },
      "loan_balance": { "type": "double" },
      "created_at": { "type": "date" }
    }
  }
}
```

### 7.4 Data Synchronization

```
PostgreSQL (via CDC) ──▶ Kafka (Debezium) ──▶ Kafka Connect (Elasticsearch Sink)
```

- No direct DB-to-ES writes
- All changes flow through Kafka for reliability and ordering
- Debezium captures row-level changes from PostgreSQL WAL
- Elasticsearch sink connector updates indices

---

## 8. Kubernetes Infrastructure

### 8.1 Cluster Architecture

```
                    ┌──────────────────────────┐
                    │   Global Load Balancer   │
                    │   (AWS Route53 / Azure   │
                    │    DNS / GCP Cloud DNS)  │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼────────┐ ┌──────▼───────┐ ┌───────▼────────┐
     │  Region 1       │ │  Region 2    │ │  Region 3      │
     │  us-east-1      │ │  eu-west-1   │ │  ap-southeast-1│
     │                 │ │              │ │                │
     │  ┌──────────┐   │ │  ┌────────┐  │ │  ┌──────────┐  │
     │  │  EKS     │   │ │  │  EKS   │  │ │  │  EKS     │  │
     │  │ Cluster  │   │ │  │Cluster │  │ │  │ Cluster  │  │
     │  └──────────┘   │ │  └────────┘  │ │  └──────────┘  │
     └─────────────────┘ └──────────────┘ └────────────────┘
```

### 8.2 Kubernetes Manifests (Key Resources)

#### 8.2.1 Namespace & Resource Quotas

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: jenga-wealth
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: service-quota
  namespace: jenga-wealth
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    limits.cpu: "200"
    limits.memory: "400Gi"
    persistentvolumeclaims: "50"
    services.loadbalancers: "10"
```

#### 8.2.2 Service Deployment (Savings Service Example)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: savings-service
  namespace: jenga-wealth
  labels:
    app: savings-service
spec:
  replicas: 12
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 3
      maxUnavailable: 1
  selector:
    matchLabels:
      app: savings-service
  template:
    metadata:
      labels:
        app: savings-service
    spec:
      containers:
      - name: savings-service
        image: jenga/savings-service:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2"
            memory: "2Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        envFrom:
        - configMapRef:
            name: jenga-config
        - secretRef:
            name: jenga-secrets
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: savings-service-hpa
  namespace: jenga-wealth
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: savings-service
  minReplicas: 6
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 25
        periodSeconds: 60
```

#### 8.2.3 Service Mesh (Istio)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: savings-service-vs
  namespace: jenga-wealth
spec:
  hosts:
  - savings-service
  http:
  - timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
    route:
    - destination:
        host: savings-service
        subset: v1
      weight: 100
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: savings-service-dr
  namespace: jenga-wealth
spec:
  host: savings-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 1024
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

### 8.3 CI/CD Pipeline (GitLab CI)

```yaml
stages:
  - lint
  - test
  - build
  - dockerize
  - deploy-staging
  - deploy-production

variables:
  DOCKER_REGISTRY: registry.jenga.co.ug
  K8S_NAMESPACE: jenga-wealth

lint:
  stage: lint
  script:
    - npm ci
    - npm run lint
    - npm run format:check

test:
  stage: test
  script:
    - npm ci
    - npm run prisma:generate
    - npm run test
    - npm run test:e2e
  coverage: /All files[^|]*\|[^|]*\s+([\d\.]+)/

build:
  stage: build
  script:
    - npm ci
    - npm run build

dockerize:
  stage: dockerize
  script:
    - docker build -t $DOCKER_REGISTRY/$CI_PROJECT_NAME:$CI_COMMIT_SHA .
    - docker tag $DOCKER_REGISTRY/$CI_PROJECT_NAME:$CI_COMMIT_SHA $DOCKER_REGISTRY/$CI_PROJECT_NAME:latest
    - docker push $DOCKER_REGISTRY/$CI_PROJECT_NAME:$CI_COMMIT_SHA
    - docker push $DOCKER_REGISTRY/$CI_PROJECT_NAME:latest

deploy-staging:
  stage: deploy-staging
  script:
    - kubectl set image deployment/$CI_PROJECT_NAME $CI_PROJECT_NAME=$DOCKER_REGISTRY/$CI_PROJECT_NAME:$CI_COMMIT_SHA -n $K8S_NAMESPACE-staging
    - kubectl rollout status deployment/$CI_PROJECT_NAME -n $K8S_NAMESPACE-staging

deploy-production:
  stage: deploy-production
  script:
    - argocd app set $CI_PROJECT_NAME --helm-set image.tag=$CI_COMMIT_SHA
    - argocd app sync $CI_PROJECT_NAME
  only:
    - main
```

### 8.4 ArgoCD GitOps

```
Application: jenga-wealth
├── clusters/
│   ├── production-us-east/
│   ├── production-eu-west/
│   └── production-ap-southeast/
├── services/
│   ├── auth-service/
│   ├── member-service/
│   ├── savings-service/
│   ├── loan-service/
│   ├── accounting-service/
│   ├── treasury-service/
│   ├── notification-service/
│   ├── audit-service/
│   ├── reporting-service/
│   └── governance-service/
├── infrastructure/
│   ├── postgres/
│   ├── redis/
│   ├── kafka/
│   ├── elasticsearch/
│   ├── clickhouse/
│   └── monitoring/
└── config/
    ├── configmap.yaml
    └── secrets.yaml
```

---

## 9. Security Blueprint

### 9.1 Security Architecture Layers

```
Layer 1: Network Security
├── VPC with private/public subnets
├── Security Groups / Network Policies
├── WAF (Cloudflare / AWS WAF)
├── DDoS Protection
└── API Gateway rate limiting

Layer 2: Transport Security
├── TLS 1.3 for all external traffic
├── mTLS for inter-service communication (Istio)
├── Certificate auto-rotation (cert-manager)
└── HSTS headers

Layer 3: Authentication & Authorization
├── OAuth 2.1 + OpenID Connect
├── JWT with RS256 signing
├── MFA (TOTP, SMS, Email)
├── RBAC with fine-grained permissions
├── Device fingerprinting
└── Session rotation on privilege escalation

Layer 4: Data Security
├── AES-256-GCM for PII at rest
├── Column-level encryption in PostgreSQL
├── Encrypted backups (AES-256)
├── Key rotation via AWS KMS / HashiCorp Vault
└── Data masking for non-privileged users

Layer 5: Application Security
├── Input validation (class-validator)
├── SQL injection protection (Prisma parameterized)
├── XSS prevention (Content-Security-Policy)
├── CSRF tokens
├── Request size limits
└── Security headers (helmet)
```

### 9.2 RBAC Matrix

| Permission | Super Admin | Admin | Treasurer | Loan Officer | Auditor | Board Member | Member |
|------------|:-----------:|:-----:|:---------:|:------------:|:-------:|:------------:|:------:|
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage System Config | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View All Members | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Members | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve Loans | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Disburse Loans | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Deposit Savings | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Withdraw Savings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Journal Entries | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Post Journal Entries | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Close Financial Period | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Run Reports | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| MFA Setup | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Announcements | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Manage Meetings/Resolutions | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| View Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Own Savings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Apply for Loan | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### 9.3 Encryption Key Hierarchy

```
Master Key (AWS KMS / Vault)
    │
    ├── Data Encryption Key (DEK) — for PII columns
    │   ├── Column Key: member.id_number
    │   ├── Column Key: member.phone_encrypted
    │   └── Column Key: member.bank_accounts
    │
    ├── Token Signing Key — for JWT
    │
    ├── Session Key — for Redis sessions
    │
    └── Backup Encryption Key — for encrypted backups
```

### 9.4 Security Monitoring

- **Real-time**: All API requests logged with user, IP, endpoint, duration
- **Anomaly Detection**: ML-based detection of unusual access patterns
- **Audit Trail**: Immutable audit log for all financial and admin operations
- **Alerting**: Immediate notification for:
  - Multiple failed login attempts
  - High-value transactions
  - Suspicious IP ranges
  - Unauthorized access attempts
  - Configuration changes

---

## 10. API Specifications

### 10.1 API Design Conventions

- **Base URL**: `https://api.jenga.co.ug/api/v1`
- **Format**: JSON (RESTful)
- **Auth**: Bearer token in `Authorization` header
- **Idempotency**: `Idempotency-Key` header for write operations
- **Pagination**: `page`, `limit` query params; response includes `total`, `totalPages`
- **Errors**: Consistent error format: `{ success: false, error: string, code: string, details?: any }`
- **Versioning**: URL-based (`/api/v1/`)

### 10.2 Endpoint Catalog

#### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with username/password |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout and invalidate session |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/mfa/setup` | Enable MFA |
| POST | `/auth/mfa/verify` | Verify MFA code |
| POST | `/auth/device/register` | Register trusted device |

#### Members

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/members` | List members (paginated) |
| POST | `/members` | Create member |
| GET | `/members/:id` | Get member details |
| PATCH | `/members/:id` | Update member |
| DELETE | `/members/:id` | Soft-delete member |
| GET | `/members/number/:memberNumber` | Lookup by member number |
| POST | `/members/:id/kyc/verify` | Verify KYC documents |
| GET | `/members/:id/beneficiaries` | List beneficiaries |
| POST | `/members/:id/beneficiaries` | Add beneficiary |

#### Savings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/savings/products` | List savings products |
| POST | `/savings/products` | Create product (admin) |
| GET | `/savings/accounts` | List member's accounts |
| POST | `/savings/accounts` | Open new account |
| POST | `/savings/deposit` | Make deposit |
| POST | `/savings/withdraw` | Make withdrawal |
| GET | `/savings/transactions` | Transaction history |
| GET | `/savings/goals` | List savings goals |
| POST | `/savings/goals` | Create goal |
| POST | `/savings/goals/:id/contribute` | Contribute to goal |

#### Loans

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/loans/products` | List loan products |
| POST | `/loans/products` | Create product (admin) |
| POST | `/loans/apply` | Submit application |
| GET | `/loans/applications` | List applications |
| GET | `/loans/pending` | Pending applications (treasurer) |
| GET | `/loans/all` | All loans (treasurer/admin) |
| PATCH | `/loans/:id/approve` | Approve application |
| PATCH | `/loans/:id/reject` | Reject application |
| POST | `/loans/:id/disburse` | Disburse approved loan |
| POST | `/loans/:id/repay` | Make repayment |
| GET | `/loans/:id/schedule` | Get repayment schedule |

#### Accounting

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounting/chart-of-accounts` | List COA |
| POST | `/accounting/chart-of-accounts` | Create account |
| GET | `/accounting/journal-entries` | List journal entries |
| POST | `/accounting/journal-entries` | Post journal entry |
| GET | `/accounting/general-ledger` | General ledger |
| GET | `/accounting/trial-balance` | Trial balance |
| GET | `/accounting/income-statement` | Income statement |
| GET | `/accounting/balance-sheet` | Balance sheet |
| POST | `/accounting/periods` | Create financial period |
| POST | `/accounting/periods/:id/close` | Close period |

#### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/member-summary` | Member demographics |
| GET | `/reports/savings-summary` | Savings portfolio |
| GET | `/reports/loan-portfolio` | Loan portfolio analysis |
| GET | `/reports/aging` | Loan aging analysis |
| GET | `/reports/financial` | Financial statements |

### 10.3 Pagination Response Format

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 15432,
    "totalPages": 772,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 10.4 Error Response Format

```json
{
  "success": false,
  "error": "Insufficient balance",
  "code": "INSUFFICIENT_BALANCE",
  "details": {
    "available": 50000,
    "requested": 100000
  },
  "requestId": "req_abc123",
  "timestamp": "2026-06-14T10:30:00Z"
}
```

---

## 11. Observability & Monitoring Architecture

### 11.1 Three Pillars of Observability

```
┌──────────────────────────────────────────────────────────┐
│                      Jenga Wealth                     │
├─────────────────┬───────────────────┬────────────────────┤
│   METRICS       │      LOGS         │      TRACES        │
│  (Prometheus)   │    (ELK Stack)    │ (OpenTelemetry)    │
├─────────────────┼───────────────────┼────────────────────┤
│ API latency     │ Application logs  │ Request tracing    │
│ DB performance  │ Error logs        │ Dependency graph   │
| Node metrics    │ Audit logs        │ Latency breakdown  │
│ Queue depth     │ Security logs     │ Error attribution  │
│ Business KPIs   │ Access logs       │                    │
└─────────────────┴───────────────────┴────────────────────┘
```

### 11.2 Prometheus Metrics

```yaml
# prometheus-rules.yaml
groups:
  - name: jenga-wealth
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        annotations:
          summary: "Error rate > 1% over 5 minutes"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        annotations:
          summary: "p95 latency > 2 seconds"

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_pool_available_connections < 10
        for: 1m
        annotations:
          summary: "Database connection pool near exhaustion"

      - alert: KafkaConsumerLag
        expr: kafka_consumer_lag > 10000
        for: 5m
        annotations:
          summary: "Kafka consumer lag > 10,000 messages"

      - alert: RedisMemoryUsage
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
        for: 5m
        annotations:
          summary: "Redis memory usage > 80%"
```

### 11.3 Custom Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `savings_deposits_total` | Counter | Total deposit amount |
| `savings_withdrawals_total` | Counter | Total withdrawal amount |
| `loans_disbursed_total` | Counter | Total loan disbursement amount |
| `loans_repaid_total` | Counter | Total repayment amount |
| `members_active_total` | Gauge | Currently active members |
| `loans_active_total` | Gauge | Currently active loans |
| `loans_overdue_total` | Gauge | Overdue loans count |
| `accounting_journals_total` | Counter | Total journal entries posted |
| `fraud_alerts_total` | Counter | Total fraud alerts triggered |

### 11.4 Grafana Dashboards

| Dashboard | Audience | Refresh |
|-----------|----------|---------|
| **Executive Overview** | C-level, Board | 5m |
| *Revenue, member growth, loan portfolio, savings, collection rate* | | |
| **Operations** | Operations team | 30s |
| *Transaction throughput, error rates, latency, queue depths* | | |
| **Database Performance** | DBA | 10s |
| *Query performance, connections, replication lag, cache hit ratio* | | |
| **Security** | Security team | 1m |
| *Failed logins, suspicious activity, MFA adoption, API abuse* | | |
| **Business KPIs** | Product, Finance | 1h |
| *PAR, ROA, ROE, member retention, NPS, collection efficiency* | | |
| **Infrastructure** | DevOps, SRE | 10s |
| *CPU, memory, network, disk, pod status, node health* | | |

### 11.5 OpenTelemetry Tracing

```typescript
// NestJS instrumentation (auto-instrumentation)
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PostgreSQLInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { KafkaInstrumentation } from '@opentelemetry/instrumentation-kafkajs';

// Trace propagation
// W3C Trace-Context headers: traceparent, tracestate
// All services propagate trace context across:
//   HTTP calls (REST)
//   Message queue (Kafka headers)
//   Database queries (pg spans)
```

### 11.6 Centralized Logging (ELK)

```yaml
# Filebeat configuration
filebeat.inputs:
- type: container
  paths:
    - /var/log/containers/*.log
  processors:
  - add_kubernetes_metadata:
      host: ${HOSTNAME}
      matchers:
      - logs_path:
          logs_path: "/var/log/containers/"

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "jenga-logs-%{+yyyy.MM.dd}"
```

---

## 12. Disaster Recovery Plan

### 12.1 Recovery Objectives

| Metric | Target |
|--------|--------|
| **RTO** (Recovery Time Objective) | < 15 minutes |
| **RPO** (Recovery Point Objective) | < 5 minutes |
| **DR Site** | Active-active multi-region |
| **Failover** | Automatic, transparent |

### 12.2 Backup Strategy

| Data | Frequency | Retention | Storage | Encryption |
|------|-----------|-----------|---------|------------|
| PostgreSQL (full) | Daily | 30 days | S3 / GCS | AES-256 |
| PostgreSQL (WAL) | Continuous | 7 days | S3 / GCS | AES-256 |
| Kafka topics | Hourly | 7 days | S3 / GCS | AES-256 |
| Redis snapshots | Hourly | 24 hours | S3 / GCS | AES-256 |
| Elasticsearch snapshots | Daily | 30 days | S3 / GCS | AES-256 |
| Application config | Git (forever) | Immutable | Git LFS | — |

### 12.3 Backup Script (PostgreSQL)

```bash
#!/bin/bash
# pg_backup.sh — WAL-G based backup for Patroni cluster

BACKUP_NAME="jenga-$(date +%Y%m%d-%H%M%S)"

# Full base backup (weekly)
wal-g backup-push \
  --pgdata /var/lib/postgresql/data \
  --full \
  --storage s3://jenga-backups/postgres/ \
  --encrypt-key "$KMS_KEY_ID"

# WAL archiving (continuous, every 5 minutes)
wal-g wal-push \
  /var/lib/postgresql/data/pg_wal/* \
  --storage s3://jenga-backups/postgres-wal/

# Verify backup integrity
wal-g backup-list --storage s3://jenga-backups/postgres/
```

### 12.4 Recovery Procedure

```
1. DETECT FAILURE
   ├── Patroni auto-detects primary failure
   ├── Prometheus alert triggers PagerDuty/OpsGenie
   └── SRE acknowledges within 5 minutes

2. FAILOVER
   ├── Patroni promotes standby to primary
   ├── PgBouncer reroutes write connections
   ├── Application retries with exponential backoff
   └── Verify data consistency (within 2 minutes)

3. REGION FAILOVER (if entire region is down)
   ├── DNS switch via Route53 / Cloud DNS (TTL=60s)
   ├── Traffic routed to DR region
   ├── PostgreSQL promoted from DR replica
   ├── Redis cluster synced from DR
   ├── Kafka consumers rebalanced
   └── Full system validation (within 10 minutes)

4. POST-RECOVERY
   ├── Root cause analysis within 24 hours
   ├── Backfill any missed events from Kafka
   ├── Verify RPO (data loss < 5 minutes)
   ├── Update disaster recovery runbook
   └── Schedule improvement work
```

### 12.5 Multi-Region Deployment

```
us-east-1 (Primary)           eu-west-1 (DR)           ap-southeast-1 (Analytics)
┌──────────────────┐          ┌──────────────────┐     ┌──────────────────┐
│  EKS Cluster     │◀────────▶│  EKS Cluster     │     │  EKS Cluster     │
│  PostgreSQL      │◀────────▶│  PostgreSQL      │     │  ClickHouse      │
│  (Patroni)       │  Async   │  (Patroni)       │     │  (Read-only)     │
│  Redis Cluster   │◀────────▶│  Redis Cluster   │     │                  │
│  Kafka Brokers   │◀────────▶│  Kafka Brokers   │     │                  │
│  Elasticsearch   │◀────────▶│  Elasticsearch   │     │                  │
└──────────────────┘          └──────────────────┘     └──────────────────┘
```

---

## 13. Scalability Blueprint

### 13.1 Horizontal Scaling Strategy

```
┌──────────────────────────────────────────────────────────────────┐
│                    HORIZONTAL SCALING LAYERS                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  L1: Stateless Services (auto-scale via HPA)                     │
│  ├── Auth Service         ─── scale on CPU + request rate         │
│  ├── Member Service       ─── scale on CPU + request rate         │
│  ├── Savings Service      ─── scale on CPU + request rate         │
│  ├── Loan Service         ─── scale on CPU + request rate         │
│  ├── Notification Service  ─── scale on queue depth               │
│  └── Reporting Service    ─── scale on request rate + memory      │
│                                                                   │
│  L2: Stateful Services (scale with sharding)                      │
│  ├── PostgreSQL           ─── read replicas + sharding (Citus)    │
│  ├── Redis                ─── cluster mode (data sharding)        │
│  ├── Kafka                ─── partition scaling                   │
│  └── Elasticsearch        ─── index sharding                      │
│                                                                   │
│  L3: Data Warehouse (scale-out columnar)                          │
│  └── ClickHouse           ─── shard + merge tree scaling          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 13.2 Capacity Planning

| Metric | Current (MVP) | Year 1 | Year 3 | Year 5 |
|--------|:-------------:|:------:|:------:|:------:|
| Members | 1,000 | 50,000 | 500,000 | 2,000,000+ |
| Concurrent Users | 100 | 2,000 | 20,000 | 100,000+ |
| Daily Transactions | 1,000 | 50,000 | 500,000 | 2,000,000+ |
| TPS Peak | 10 | 500 | 5,000 | 10,000+ |
| Storage (PostgreSQL) | 5 GB | 250 GB | 1 TB | 5 TB+ |
| Storage (ClickHouse) | — | 1 TB | 10 TB | 50 TB+ |

### 13.3 Scaling Limits & Bottlenecks

| Component | Bottleneck | Solution |
|-----------|-----------|----------|
| PostgreSQL | Write throughput on single leader | Citus distributed tables, connection pooling |
| Kafka | Partition count limits broker memory | Increase broker count, tune segment size |
| Redis | Memory bandwidth for large value sizes | Cluster mode, compress cached values |
| Elasticsearch | Shard count per node | Increase node count, tune shard size |
| Node.js | Event loop blocking for CPU-heavy ops | Offload to worker threads, separate CPU-heavy operations |
| Network | Connection overhead per service | gRPC for inter-service, connection pooling |

### 13.4 Cost Optimization

| Strategy | Implementation | Estimated Savings |
|----------|---------------|------------------|
| **Spot Instances** | Use spot instances for stateless services (with PDB to handle interruption) | 60–70% on compute |
| **Reserved Instances** | 1-year / 3-year RIs for stateful services (DB, Redis, Kafka) | 30–50% on DB nodes |
| **Auto-scaling** | Scale to zero for non-production environments; HPA for production | 40% on staging |
| **Storage Tiering** | Hot (NVMe) → Warm (SSD) → Cold (HDD/S3) for PostgreSQL table partitions | 50% on storage |
| **Compression** | Page compression in PostgreSQL; codec compression in Kafka; snappy in ClickHouse | 30–50% on disk |
| **Caching** | L1 cache in application memory reduces L2/L3 reads by 80% | Reduced DB load |

### 13.5 Performance Benchmarks

| Operation | Target | 95th Percentile |
|-----------|--------|:--------------:|
| Login | < 500ms | < 1s |
| Member search | < 200ms | < 500ms |
| Savings deposit | < 1s | < 2s |
| Loan application | < 1s | < 3s |
| Dashboard load (member) | < 1s | < 2s |
| Dashboard load (admin) | < 3s | < 5s |
| Journal entry post | < 500ms | < 1s |
| Report generation | < 5s | < 15s |
| Transaction search | < 200ms | < 500ms |
| Real-time notification | < 2s | < 5s |

---

## Appendix A: Technology Vendor Recommendations

| Category | Primary | Alternative | Rationale |
|----------|---------|-------------|-----------|
| **Cloud** | AWS | Azure, GCP | Maturity of RDS/Aurora, EKS, MSK, OpenSearch |
| **CI/CD** | GitLab CI | GitHub Actions, Jenkins | Built-in registry, Kubernetes integration |
| **GitOps** | ArgoCD | Flux | Mature, multi-cluster support |
| **Service Mesh** | Istio | Linkerd | Feature-rich, Envoy-based, observability |
| **Secrets** | HashiCorp Vault | AWS Secrets Manager | Multi-cloud, dynamic secrets |
| **Monitoring** | Grafana + Prometheus | Datadog, New Relic | Open-source, extensible, cost-effective at scale |
| **Logging** | ELK Stack | Grafana Loki | Full-text search, Kibana visualizations |
| **Tracing** | OpenTelemetry + Jaeger | Datadog APM | Open standard, vendor-neutral |
| **Incident Mgmt** | PagerDuty | OpsGenie | Reliable alerting, on-call scheduling |
| **Email** | SendGrid | Mailgun, AWS SES | Deliverability, template engine |
| **SMS** | Twilio | Africa's Talking, Vonage | Regional coverage, reliability |
| **Payment** | Paystack / Flutterwave | Stripe | African payment gateway support |

---

## Appendix B: Compliance & Regulatory

| Standard | Description | Implementation |
|----------|-------------|---------------|
| **ISO 27001** | Information security management | ISMS, risk assessment, security controls |
| **PCI DSS** | Payment card security | Encryption, access control, audit trails |
| **GDPR** | Data protection | Consent management, data portability, right to erasure |
| **SOX** | Financial controls | Audit trails, segregation of duties, access reviews |
| **NAFIS** | National Financial Inclusion Strategy (Uganda) | Agent banking, mobile money integration |
| **URA** | Uganda Revenue Authority | Tax compliance, automated reporting |

---

## Appendix C: Development Roadmap

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1: Foundation** | Months 1–3 | Auth service, Member service, basic CRUD, PostgreSQL schema, CI/CD pipeline, Kubernetes provisioning |
| **Phase 2: Core Financial** | Months 3–6 | Savings service (deposit/withdraw/interest), Loan service (application/approval/disbursement/repayment), Accounting engine (double-entry, GL) |
| **Phase 3: Treasury & Operations** | Months 6–8 | Treasury service (cash position, reconciliation), Notification service (email, SMS, push), Audit service, Reporting service (basic) |
| **Phase 4: Intelligence** | Months 8–10 | Risk scoring, fraud detection (ML), advanced reporting, BI dashboards, ClickHouse data warehouse |
| **Phase 5: Scale** | Months 10–12 | Performance optimization, sharding, multi-region deployment, DR verification, load testing at scale (2M members, 10K TPS) |
| **Phase 6: Digital Banking** | Months 12–18 | Mobile app, USSD, agent banking, mobile money integration, payment gateway, open banking APIs |

---

*Document version 1.0.0 — Last updated June 2026*
