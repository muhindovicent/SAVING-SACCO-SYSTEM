CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum types
CREATE TYPE user_role AS ENUM ('admin', 'treasurer', 'member');
CREATE TYPE loan_status AS ENUM ('pending', 'active', 'repaid', 'defaulted', 'rejected', 'written_off');
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'interest', 'fee', 'transfer_in', 'transfer_out');
CREATE TYPE payment_method AS ENUM ('mtn', 'airtel', 'bank', 'cash', 'payroll', 'qr');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE meeting_type AS ENUM ('annual', 'quarterly', 'special', 'board');
CREATE TYPE vote_status AS ENUM ('pending', 'active', 'passed', 'rejected');

-- Users & Auth
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT true,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  mfa_secret VARCHAR(255),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Members
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id),
  member_no VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  id_number VARCHAR(50),
  date_of_birth DATE,
  gender VARCHAR(10),
  occupation VARCHAR(200),
  employer VARCHAR(200),
  monthly_income DECIMAL(15,2) DEFAULT 0,
  photo_url VARCHAR(500),
  signature_url VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  nationality VARCHAR(50),
  district VARCHAR(100),
  county VARCHAR(100),
  sub_county VARCHAR(100),
  village VARCHAR(100),
  postal_address VARCHAR(200),
  next_of_kin_name VARCHAR(200),
  next_of_kin_phone VARCHAR(20),
  next_of_kin_relation VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  percentage DECIMAL(5,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Shares
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  share_type VARCHAR(50) NOT NULL DEFAULT 'ordinary',
  total_units DECIMAL(15,2) NOT NULL DEFAULT 0,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 1000,
  total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE share_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  share_id UUID NOT NULL REFERENCES shares(id),
  transaction_type VARCHAR(20) NOT NULL,
  units DECIMAL(15,2) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Savings
CREATE TABLE savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  account_no VARCHAR(20) UNIQUE NOT NULL,
  account_type VARCHAR(50) NOT NULL DEFAULT 'regular',
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  interest_rate DECIMAL(5,2) NOT NULL DEFAULT 2.5,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE savings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES savings_accounts(id),
  member_id UUID NOT NULL REFERENCES members(id),
  type transaction_type NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  reference VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Loans
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  loan_no VARCHAR(20) UNIQUE NOT NULL,
  loan_type VARCHAR(50) NOT NULL,
  principal DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL DEFAULT 12,
  duration_months INTEGER NOT NULL,
  status loan_status NOT NULL DEFAULT 'pending',
  disbursed_at TIMESTAMPTZ,
  disbursed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  loan_type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  purpose TEXT,
  duration_months INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE loan_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id),
  installment_no INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal DECIMAL(15,2) NOT NULL DEFAULT 0,
  interest DECIMAL(15,2) NOT NULL DEFAULT 0,
  fees DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_due DECIMAL(15,2) NOT NULL,
  paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id),
  schedule_id UUID REFERENCES loan_schedules(id),
  member_id UUID NOT NULL REFERENCES members(id),
  amount DECIMAL(15,2) NOT NULL,
  principal_part DECIMAL(15,2) NOT NULL DEFAULT 0,
  interest_part DECIMAL(15,2) NOT NULL DEFAULT 0,
  fees_part DECIMAL(15,2) NOT NULL DEFAULT 0,
  method payment_method,
  reference VARCHAR(100),
  receipt_no VARCHAR(50),
  trans_ref VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Contributions
CREATE TABLE contribution_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
  amount DECIMAL(15,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  cycle_id UUID NOT NULL REFERENCES contribution_cycles(id),
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_method payment_method,
  reference VARCHAR(100),
  receipt_no VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Payments
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  method payment_method NOT NULL,
  provider VARCHAR(50),
  account_no VARCHAR(100),
  phone_number VARCHAR(20),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  payment_method_id UUID REFERENCES payment_methods(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  fees DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'UGX',
  status payment_status NOT NULL DEFAULT 'pending',
  reference VARCHAR(100),
  trans_ref VARCHAR(100),
  receipt_no VARCHAR(50),
  callback_url VARCHAR(500),
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Penalties
CREATE TABLE penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id),
  loan_id UUID REFERENCES loans(id),
  penalty_type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  reason TEXT,
  waived BOOLEAN NOT NULL DEFAULT false,
  waived_by UUID REFERENCES users(id),
  waived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Governance
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  meeting_type meeting_type NOT NULL,
  meeting_date TIMESTAMPTZ NOT NULL,
  venue VARCHAR(200),
  agenda JSONB,
  minutes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id),
  member_id UUID NOT NULL REFERENCES members(id),
  attended BOOLEAN NOT NULL DEFAULT false,
  check_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE voting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  meeting_id UUID REFERENCES meetings(id),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  options JSONB NOT NULL,
  status vote_status NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES voting_sessions(id),
  member_id UUID NOT NULL REFERENCES members(id),
  option_selected VARCHAR(100) NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Accounting
CREATE TABLE ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(20) UNIQUE NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  parent_id UUID REFERENCES ledger_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  entry_date DATE NOT NULL,
  total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'posted',
  posted_by UUID REFERENCES users(id),
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id),
  account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  notes TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Audit
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Settings
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'string',
  description TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_members_member_no ON members(member_no);
CREATE INDEX idx_savings_accounts_member_id ON savings_accounts(member_id);
CREATE INDEX idx_loans_member_id ON loans(member_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loan_schedules_loan_id ON loan_schedules(loan_id);
CREATE INDEX idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX idx_contributions_member_id ON contributions(member_id);
CREATE INDEX idx_contributions_cycle_id ON contributions(cycle_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX idx_payment_transactions_member_id ON payment_transactions(member_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_members_status ON members(status);

-- Seed admin user (password: Admin@123)
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@jengawealth.com', crypt('Admin@123', gen_salt('bf')), 'admin'),
  ('treasurer@jengawealth.com', crypt('Admin@123', gen_salt('bf')), 'treasurer'),
  ('john@jengawealth.com', crypt('Member@123', gen_salt('bf')), 'member'),
  ('jane@jengawealth.com', crypt('Member@123', gen_salt('bf')), 'member'),
  ('peter@jengawealth.com', crypt('Member@123', gen_salt('bf')), 'member');

INSERT INTO members (user_id, member_no, first_name, last_name, phone, email, id_number) VALUES
  ((SELECT id FROM users WHERE email='admin@jengawealth.com'), 'JNW-ADMIN-001', 'System', 'Administrator', '+256700000001', 'admin@jengawealth.com', 'CF000001'),
  ((SELECT id FROM users WHERE email='treasurer@jengawealth.com'), 'JNW-TREAS-001', 'Finance', 'Officer', '+256700000002', 'treasurer@jengawealth.com', 'CF000002'),
  ((SELECT id FROM users WHERE email='john@jengawealth.com'), 'JNW-MEM-001', 'John', 'Doe', '+256700000003', 'john@jengawealth.com', 'CF000003'),
  ((SELECT id FROM users WHERE email='jane@jengawealth.com'), 'JNW-MEM-002', 'Jane', 'Smith', '+256700000004', 'jane@jengawealth.com', 'CF000004'),
  ((SELECT id FROM users WHERE email='peter@jengawealth.com'), 'JNW-MEM-003', 'Peter', 'Kamau', '+256700000005', 'peter@jengawealth.com', 'CF000005');
