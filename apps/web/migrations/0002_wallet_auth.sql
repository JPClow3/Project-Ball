CREATE TABLE IF NOT EXISTS wallet_users (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS wallet_auth_nonces (
  nonce TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  intent TEXT NOT NULL CHECK (intent IN ('login', 'register')),
  message TEXT NOT NULL,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS wallet_auth_nonces_lookup_idx
  ON wallet_auth_nonces (wallet_address, intent, consumed_at, issued_at);

CREATE TABLE IF NOT EXISTS wallet_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES wallet_users(id)
);

CREATE INDEX IF NOT EXISTS wallet_sessions_user_idx
  ON wallet_sessions (user_id, expires_at);
