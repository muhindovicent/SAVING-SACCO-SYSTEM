-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMINISTRATOR', 'TREASURER', 'LOAN_OFFICER', 'AUDITOR', 'BOARD_MEMBER', 'MEMBER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED', 'SUSPENDED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DORMANT', 'SUSPENDED', 'RESIGNED', 'DECEASED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SavingsAccountStatus" AS ENUM ('ACTIVE', 'FROZEN', 'DORMANT', 'CLOSED');

-- CreateEnum
CREATE TYPE "SavingsProductType" AS ENUM ('REGULAR', 'FIXED_DEPOSIT', 'GOAL_BASED', 'INSTITUTIONAL');

-- CreateEnum
CREATE TYPE "SavingsTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'TRANSFER_IN', 'TRANSFER_OUT', 'FEE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CHEQUE', 'CARD', 'INTERNAL');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'ACTIVE', 'OVERDUE', 'RESTRUCTURED', 'PAID', 'WRITTEN_OFF', 'REJECTED');

-- CreateEnum
CREATE TYPE "LoanProductType" AS ENUM ('REGULAR', 'EMERGENCY', 'AGRICULTURE', 'EDUCATION', 'BUSINESS', 'GROUP');

-- CreateEnum
CREATE TYPE "CashAccountType" AS ENUM ('PETTY_CASH', 'BANK', 'MOBILE_MONEY', 'CASH_IN_TRANSIT', 'INVESTMENT');

-- CreateEnum
CREATE TYPE "AccountCategory" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountSubCategory" AS ENUM ('CURRENT_ASSET', 'FIXED_ASSET', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'SHARE_CAPITAL', 'RETAINED_EARNINGS', 'RESERVES', 'INTEREST_INCOME', 'FEE_INCOME', 'OPERATING_EXPENSE', 'ADMIN_EXPENSE', 'PROVISION_EXPENSE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'DISBURSE', 'EXPORT', 'PRINT');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('USER', 'MEMBER', 'SAVINGS_ACCOUNT', 'LOAN', 'LOAN_APPLICATION', 'LOAN_REPAYMENT', 'SHARE', 'JOURNAL_ENTRY', 'CASH_ACCOUNT', 'RECONCILIATION', 'ANNOUNCEMENT', 'SYSTEM_CONFIG');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('AGM', 'BOARD', 'COMMITTEE', 'SPECIAL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" TEXT NOT NULL,
    "password_salt" VARCHAR(64),
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "mfa_method" VARCHAR(20),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" VARCHAR(45),
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "device_id" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_activity_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(255),
    "device_type" VARCHAR(50),
    "is_trusted" BOOLEAN NOT NULL DEFAULT false,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "username" VARCHAR(50) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL,
    "fail_reason" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "member_number" VARCHAR(20) NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "date_joined" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status_changed_at" TIMESTAMP(3),
    "full_name" VARCHAR(255) NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "gender" VARCHAR(10),
    "nationality" VARCHAR(100),
    "email" VARCHAR(255),
    "phone_primary" VARCHAR(20),
    "phone_secondary" VARCHAR(20),
    "address_line1" VARCHAR(255),
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100),
    "district" VARCHAR(100),
    "country" VARCHAR(100) DEFAULT 'Uganda',
    "occupation" VARCHAR(255),
    "employer" VARCHAR(255),
    "income_range" VARCHAR(50),
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "kyc_verified_at" TIMESTAMP(3),
    "kyc_verified_by" UUID,
    "id_type" VARCHAR(50),
    "id_number" VARCHAR(100),
    "id_expiry_date" TIMESTAMP(3),
    "id_number_encrypted" TEXT,
    "phone_encrypted" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "relationship" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "id_number" VARCHAR(100),
    "allocation_pct" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_documents" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "doc_type" VARCHAR(50) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_hash" VARCHAR(64) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" UUID,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "product_type" "SavingsProductType" NOT NULL DEFAULT 'REGULAR',
    "min_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "max_balance" DECIMAL(15,2),
    "interest_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "interest_freq" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    "charges" JSONB DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_accounts" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "account_number" VARCHAR(20) NOT NULL,
    "status" "SavingsAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "available_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "lien_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "last_interest_at" TIMESTAMP(3),
    "last_transaction_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_goals" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "target_amount" DECIMAL(15,2) NOT NULL,
    "current_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "target_date" TIMESTAMP(3),
    "auto_allocate" DECIMAL(15,2),
    "achieved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_transactions" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "type" "SavingsTransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balance_before" DECIMAL(15,2) NOT NULL,
    "balance_after" DECIMAL(15,2) NOT NULL,
    "reference" VARCHAR(100),
    "description" TEXT,
    "payment_method" "PaymentMethod",
    "receipt_number" VARCHAR(50),
    "journal_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "savings_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_interest" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "journal_id" UUID,
    "credited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "savings_interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_products" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "product_type" "LoanProductType" NOT NULL DEFAULT 'REGULAR',
    "min_amount" DECIMAL(15,2) NOT NULL,
    "max_amount" DECIMAL(15,2),
    "interest_rate" DECIMAL(5,2) NOT NULL,
    "interest_method" VARCHAR(20) NOT NULL DEFAULT 'FLAT',
    "repayment_period" INTEGER NOT NULL,
    "repayment_freq" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    "grace_period" INTEGER NOT NULL DEFAULT 0,
    "late_penalty_rate" DECIMAL(5,2),
    "late_penalty_fixed" DECIMAL(15,2),
    "processing_fee" DECIMAL(5,2),
    "requires_guarantor" BOOLEAN NOT NULL DEFAULT false,
    "requires_collateral" BOOLEAN NOT NULL DEFAULT false,
    "max_guarantors" INTEGER NOT NULL DEFAULT 2,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_applications" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "application_no" VARCHAR(20) NOT NULL,
    "principal" DECIMAL(15,2) NOT NULL,
    "purpose" TEXT,
    "repayment_period" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "risk_score" INTEGER,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "loan_no" VARCHAR(20) NOT NULL,
    "principal" DECIMAL(15,2) NOT NULL,
    "interest_rate" DECIMAL(5,2) NOT NULL,
    "interest_method" VARCHAR(20) NOT NULL DEFAULT 'FLAT',
    "total_interest" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "amount_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL,
    "repayment_period" INTEGER NOT NULL,
    "repayment_freq" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    "disbursed_at" TIMESTAMP(3),
    "disbursed_by" UUID,
    "first_due_date" TIMESTAMP(3),
    "last_due_date" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "restructured_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "written_off_at" TIMESTAMP(3),
    "written_off_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_schedules" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "installment" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "principal" DECIMAL(15,2) NOT NULL,
    "interest" DECIMAL(15,2) NOT NULL,
    "fees" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_repayments" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "principal_portion" DECIMAL(15,2) NOT NULL,
    "interest_portion" DECIMAL(15,2) NOT NULL,
    "penalty_portion" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payment_method" VARCHAR(50) NOT NULL,
    "reference" VARCHAR(100),
    "journal_id" UUID,
    "received_by" UUID NOT NULL,
    "notes" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_repayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_penalties" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "days_overdue" INTEGER NOT NULL,
    "waived_at" TIMESTAMP(3),
    "waived_by" UUID,
    "journal_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_guarantors" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "guarantor_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_guarantors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_collaterals" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "estimated_value" DECIMAL(15,2) NOT NULL,
    "document_ref" VARCHAR(255),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_collaterals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shares" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "total_units" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_purchases" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "share_id" UUID NOT NULL,
    "units" DECIMAL(15,2) NOT NULL,
    "price_per_unit" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "journal_id" UUID,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_values" (
    "id" UUID NOT NULL,
    "price_per_unit" DECIMAL(15,2) NOT NULL,
    "effective_date" DATE NOT NULL,
    "set_by" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dividend_distributions" (
    "id" UUID NOT NULL,
    "financial_year" VARCHAR(10) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "per_unit_amount" DECIMAL(15,2) NOT NULL,
    "declared_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "approved_by" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DECLARED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dividend_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_accounts" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "account_type" "CashAccountType" NOT NULL,
    "account_number" VARCHAR(50),
    "bank_name" VARCHAR(255),
    "branch_code" VARCHAR(50),
    "swift_code" VARCHAR(20),
    "mobile_provider" VARCHAR(50),
    "mobile_number" VARCHAR(20),
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'UGX',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_reconciliations" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "system_balance" DECIMAL(15,2) NOT NULL,
    "actual_balance" DECIMAL(15,2) NOT NULL,
    "difference" DECIMAL(15,2) NOT NULL,
    "reconciled_at" TIMESTAMP(3) NOT NULL,
    "reconciled_by" UUID NOT NULL,
    "notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" "AccountCategory" NOT NULL,
    "sub_category" "AccountSubCategory",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_control" BOOLEAN NOT NULL DEFAULT false,
    "parent_id" UUID,
    "normal_side" VARCHAR(5) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_periods" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_at" TIMESTAMP(3),
    "closed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "journal_no" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "period_id" UUID NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "total_debit" DECIMAL(15,2) NOT NULL,
    "total_credit" DECIMAL(15,2) NOT NULL,
    "reference" VARCHAR(100),
    "reference_id" UUID,
    "ref_type" VARCHAR(50),
    "is_reversal" BOOLEAN NOT NULL DEFAULT false,
    "reversed_by_id" UUID,
    "posted_by" UUID NOT NULL,
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_posted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" UUID NOT NULL,
    "journal_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "general_ledger" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "period_id" UUID NOT NULL,
    "opening" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "debits" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credits" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "closing" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "general_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity" "AuditEntity" NOT NULL,
    "entity_id" UUID,
    "description" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "session_id" UUID,
    "correlation_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'INFO',
    "message" TEXT,
    "metadata" JSONB,
    "source" VARCHAR(100),
    "trace_id" VARCHAR(100),
    "actor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "type" "MeetingType" NOT NULL DEFAULT 'AGM',
    "date" TIMESTAMP(3) NOT NULL,
    "venue" VARCHAR(255),
    "agenda" JSONB DEFAULT '[]',
    "minutes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolutions" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
    "votes_for" INTEGER NOT NULL DEFAULT 0,
    "votes_against" INTEGER NOT NULL DEFAULT 0,
    "votes_abstain" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" UUID NOT NULL,
    "resolution_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "vote" VARCHAR(10) NOT NULL,
    "cast_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'STRING',
    "group" VARCHAR(50),
    "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_key" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_token_idx" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "user_sessions_refresh_token_idx" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_user_id_device_id_key" ON "user_devices"("user_id", "device_id");

-- CreateIndex
CREATE INDEX "login_attempts_user_id_idx" ON "login_attempts"("user_id");

-- CreateIndex
CREATE INDEX "login_attempts_created_at_idx" ON "login_attempts"("created_at");

-- CreateIndex
CREATE INDEX "password_history_user_id_idx" ON "password_history"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_member_number_key" ON "members"("member_number");

-- CreateIndex
CREATE INDEX "members_member_number_idx" ON "members"("member_number");

-- CreateIndex
CREATE INDEX "members_status_idx" ON "members"("status");

-- CreateIndex
CREATE INDEX "members_kyc_status_idx" ON "members"("kyc_status");

-- CreateIndex
CREATE INDEX "beneficiaries_member_id_idx" ON "beneficiaries"("member_id");

-- CreateIndex
CREATE INDEX "member_documents_member_id_idx" ON "member_documents"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "savings_products_code_key" ON "savings_products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "savings_accounts_account_number_key" ON "savings_accounts"("account_number");

-- CreateIndex
CREATE INDEX "savings_accounts_member_id_idx" ON "savings_accounts"("member_id");

-- CreateIndex
CREATE INDEX "savings_accounts_product_id_idx" ON "savings_accounts"("product_id");

-- CreateIndex
CREATE INDEX "savings_goals_account_id_idx" ON "savings_goals"("account_id");

-- CreateIndex
CREATE INDEX "savings_transactions_account_id_idx" ON "savings_transactions"("account_id");

-- CreateIndex
CREATE INDEX "savings_transactions_type_idx" ON "savings_transactions"("type");

-- CreateIndex
CREATE INDEX "savings_transactions_created_at_idx" ON "savings_transactions"("created_at");

-- CreateIndex
CREATE INDEX "savings_interest_account_id_idx" ON "savings_interest"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "loan_products_code_key" ON "loan_products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "loan_applications_application_no_key" ON "loan_applications"("application_no");

-- CreateIndex
CREATE INDEX "loan_applications_member_id_idx" ON "loan_applications"("member_id");

-- CreateIndex
CREATE INDEX "loan_applications_status_idx" ON "loan_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "loans_application_id_key" ON "loans"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "loans_loan_no_key" ON "loans"("loan_no");

-- CreateIndex
CREATE INDEX "loans_member_id_idx" ON "loans"("member_id");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX "loan_schedules_loan_id_idx" ON "loan_schedules"("loan_id");

-- CreateIndex
CREATE INDEX "loan_repayments_loan_id_idx" ON "loan_repayments"("loan_id");

-- CreateIndex
CREATE INDEX "loan_repayments_member_id_idx" ON "loan_repayments"("member_id");

-- CreateIndex
CREATE INDEX "loan_penalties_loan_id_idx" ON "loan_penalties"("loan_id");

-- CreateIndex
CREATE UNIQUE INDEX "loan_guarantors_application_id_guarantor_id_key" ON "loan_guarantors"("application_id", "guarantor_id");

-- CreateIndex
CREATE INDEX "loan_collaterals_application_id_idx" ON "loan_collaterals"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "shares_member_id_key" ON "shares"("member_id");

-- CreateIndex
CREATE INDEX "shares_member_id_idx" ON "shares"("member_id");

-- CreateIndex
CREATE INDEX "share_purchases_member_id_idx" ON "share_purchases"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_values_effective_date_key" ON "share_values"("effective_date");

-- CreateIndex
CREATE INDEX "cash_reconciliations_account_id_idx" ON "cash_reconciliations"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_code_key" ON "chart_of_accounts"("code");

-- CreateIndex
CREATE INDEX "chart_of_accounts_code_idx" ON "chart_of_accounts"("code");

-- CreateIndex
CREATE INDEX "chart_of_accounts_category_idx" ON "chart_of_accounts"("category");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_journal_no_key" ON "journal_entries"("journal_no");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_reversed_by_id_key" ON "journal_entries"("reversed_by_id");

-- CreateIndex
CREATE INDEX "journal_entries_period_id_idx" ON "journal_entries"("period_id");

-- CreateIndex
CREATE INDEX "journal_entries_entry_date_idx" ON "journal_entries"("entry_date");

-- CreateIndex
CREATE INDEX "journal_entries_reference_id_idx" ON "journal_entries"("reference_id");

-- CreateIndex
CREATE INDEX "journal_lines_journal_id_idx" ON "journal_lines"("journal_id");

-- CreateIndex
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "general_ledger_account_id_period_id_key" ON "general_ledger"("account_id", "period_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "system_events_event_type_idx" ON "system_events"("event_type");

-- CreateIndex
CREATE INDEX "system_events_severity_idx" ON "system_events"("severity");

-- CreateIndex
CREATE INDEX "system_events_created_at_idx" ON "system_events"("created_at");

-- CreateIndex
CREATE INDEX "resolutions_meeting_id_idx" ON "resolutions"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_resolution_id_member_id_key" ON "votes"("resolution_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_accounts" ADD CONSTRAINT "savings_accounts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_accounts" ADD CONSTRAINT "savings_accounts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "savings_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "savings_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_transactions" ADD CONSTRAINT "savings_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "savings_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_interest" ADD CONSTRAINT "savings_interest_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "savings_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "loan_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "loan_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_schedules" ADD CONSTRAINT "loan_schedules_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_repayments" ADD CONSTRAINT "loan_repayments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_penalties" ADD CONSTRAINT "loan_penalties_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_guarantors" ADD CONSTRAINT "loan_guarantors_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "loan_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_collaterals" ADD CONSTRAINT "loan_collaterals_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "loan_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_purchases" ADD CONSTRAINT "share_purchases_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_purchases" ADD CONSTRAINT "share_purchases_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "shares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_reconciliations" ADD CONSTRAINT "cash_reconciliations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "cash_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_ledger" ADD CONSTRAINT "general_ledger_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_ledger" ADD CONSTRAINT "general_ledger_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_events" ADD CONSTRAINT "system_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

