CREATE TABLE IF NOT EXISTS bet_confirmations (
  tx_hash TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  bettor TEXT,
  outcome TEXT,
  token TEXT,
  amount TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stats_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  daily_active_users INTEGER NOT NULL DEFAULT 0,
  monthly_active_users INTEGER NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  unique_onchain_users INTEGER NOT NULL DEFAULT 0,
  volume_usd TEXT NOT NULL DEFAULT '0',
  failed_transaction_rate TEXT NOT NULL DEFAULT '0%',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
