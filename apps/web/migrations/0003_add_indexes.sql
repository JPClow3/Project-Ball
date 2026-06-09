-- Migration number: 0003 	 2026-06-09T19:50:00.000Z
CREATE INDEX IF NOT EXISTS bet_confirmations_bettor_idx ON bet_confirmations (bettor);
