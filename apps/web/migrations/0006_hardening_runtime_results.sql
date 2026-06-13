-- Migration number: 0006         2026-06-12T00:00:00.000Z
-- Harden result and payout persistence.

ALTER TABLE bet_confirmations
  ADD COLUMN IF NOT EXISTS normalized_amount TEXT;

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS provider TEXT;

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS provider_fixture_id TEXT;

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS home_score INTEGER;

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS away_score INTEGER;

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS source_updated_at TEXT;

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (reconciliation_status IN ('pending', 'reconciled', 'failed', 'manual'));

CREATE INDEX IF NOT EXISTS match_results_provider_fixture_idx
  ON match_results (provider, provider_fixture_id);
