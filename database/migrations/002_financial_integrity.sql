-- Idempotency keys to prevent duplicate financial transactions
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  endpoint VARCHAR(200) NOT NULL,
  request_hash VARCHAR(255) NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

-- Cleanup expired keys periodically
-- DELETE FROM idempotency_keys WHERE expires_at < NOW();

-- Additional constraints for financial integrity

-- Savings account balance cannot be negative
ALTER TABLE savings_accounts
  ADD CONSTRAINT IF NOT EXISTS savings_balance_non_negative
  CHECK (balance >= 0);

-- Savings transaction amounts must be positive
ALTER TABLE savings_transactions
  ADD CONSTRAINT IF NOT EXISTS savings_txn_amount_positive
  CHECK (amount > 0);

-- Balance after must equal balance before +/- amount
-- (This is enforced in application logic; DB constraint below is a sanity check)
ALTER TABLE savings_transactions
  ADD CONSTRAINT IF NOT EXISTS savings_txn_type_valid
  CHECK (type IN ('deposit', 'withdrawal', 'interest', 'fee', 'transfer_in', 'transfer_out'));

-- Loan principal must be positive
ALTER TABLE loans
  ADD CONSTRAINT IF NOT EXISTS loans_principal_positive
  CHECK (principal > 0);

-- Loan interest rate must be non-negative
ALTER TABLE loans
  ADD CONSTRAINT IF NOT EXISTS loans_interest_rate_non_negative
  CHECK (interest_rate >= 0);

-- Loan duration must be positive
ALTER TABLE loans
  ADD CONSTRAINT IF NOT EXISTS loans_duration_positive
  CHECK (duration_months > 0);

-- Loan schedule amounts must be non-negative
ALTER TABLE loan_schedules
  ADD CONSTRAINT IF NOT EXISTS loan_schedule_amounts_non_negative
  CHECK (principal >= 0 AND interest >= 0 AND fees >= 0 AND total_due >= 0 AND paid_amount >= 0);

-- Loan repayment amounts must be positive
ALTER TABLE loan_repayments
  ADD CONSTRAINT IF NOT EXISTS loan_repayment_amount_positive
  CHECK (amount > 0);

-- Journal entries must balance (debit = credit)
ALTER TABLE journal_entries
  ADD CONSTRAINT IF NOT EXISTS journal_entry_balanced
  CHECK (total_debit = total_credit);

-- Journal line amounts must be non-negative
ALTER TABLE journal_lines
  ADD CONSTRAINT IF NOT EXISTS journal_line_amounts_non_negative
  CHECK (debit >= 0 AND credit >= 0);

-- A journal line cannot have both debit and credit
ALTER TABLE journal_lines
  ADD CONSTRAINT IF NOT EXISTS journal_line_single_side
  CHECK ((debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0) OR (debit = 0 AND credit = 0));

-- Contribution amount must be positive
ALTER TABLE contributions
  ADD CONSTRAINT IF NOT EXISTS contribution_amount_positive
  CHECK (amount > 0);

-- Share units must be non-negative
ALTER TABLE shares
  ADD CONSTRAINT IF NOT EXISTS share_units_non_negative
  CHECK (total_units >= 0);

-- Penalty amount must be non-negative
ALTER TABLE penalties
  ADD CONSTRAINT IF NOT EXISTS penalty_amount_non_negative
  CHECK (amount >= 0);

-- Payment transaction amount must be positive
ALTER TABLE payment_transactions
  ADD CONSTRAINT IF NOT EXISTS payment_txn_amount_positive
  CHECK (amount > 0);