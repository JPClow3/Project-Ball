-- Migration number: 0004         2026-06-11T00:00:00.000Z
-- Add tables for leaderboard system

CREATE TABLE IF NOT EXISTS match_results (
  match_id TEXT PRIMARY KEY,
  outcome TEXT NOT NULL CHECK (outcome IN ('HOME', 'DRAW', 'AWAY')),
  resolved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tx_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS match_results_resolved_at_idx 
  ON match_results (resolved_at DESC);

CREATE TABLE IF NOT EXISTS user_leaderboard (
  wallet_address TEXT PRIMARY KEY,
  display_name TEXT,
  total_bets INTEGER NOT NULL DEFAULT 0,
  correct_bets INTEGER NOT NULL DEFAULT 0,
  accuracy_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
  total_won_usd DECIMAL(12, 2) NOT NULL DEFAULT 0,
  combined_score DECIMAL(10, 2) NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS user_leaderboard_combined_score_idx 
  ON user_leaderboard (combined_score DESC);

CREATE INDEX IF NOT EXISTS user_leaderboard_accuracy_idx 
  ON user_leaderboard (accuracy_percentage DESC);