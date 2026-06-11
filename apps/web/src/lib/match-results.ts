import type { Outcome } from "@project-ball/shared";

type D1 = RuntimeEnv["PROJECT_BALL_DB"];

export type MatchResult = {
  readonly matchId: string;
  readonly outcome: Outcome;
  readonly resolvedAt: string;
  readonly txHash?: string;
};

type MatchResultRow = {
  readonly match_id: string;
  readonly outcome: string;
  readonly resolved_at: string;
  readonly tx_hash: string | null;
  readonly created_at: string;
};

function isOutcome(value: unknown): value is Outcome {
  return value === "HOME" || value === "DRAW" || value === "AWAY";
}

function toMatchResult(row: MatchResultRow): MatchResult | null {
  if (!isOutcome(row.outcome)) {
    return null;
  }

  return {
    matchId: row.match_id,
    outcome: row.outcome,
    resolvedAt: row.resolved_at,
    txHash: row.tx_hash ?? undefined
  };
}

function isMissingMatchResultsTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("no such table: match_results") ||
    message.includes('relation "match_results" does not exist')
  );
}

async function recordMatchResult(
  db: D1,
  matchId: string,
  outcome: Outcome,
  txHash?: string
): Promise<void> {
  if (!db) {
    console.warn("Database unavailable. Cannot record match result.");
    return;
  }

  try {
    await db
      .prepare(
        `INSERT INTO match_results (match_id, outcome, tx_hash)
         VALUES (?, ?, ?)
         ON CONFLICT (match_id) DO UPDATE SET
           outcome = excluded.outcome,
           tx_hash = excluded.tx_hash,
           resolved_at = CURRENT_TIMESTAMP`
      )
      .bind(matchId, outcome, txHash ?? null)
      .run();
  } catch (error) {
    if (!isMissingMatchResultsTable(error)) {
      throw error;
    }
    console.warn("match_results table does not exist. Run migration 0004.");
  }
}

async function getMatchResult(db: D1, matchId: string): Promise<MatchResult | null> {
  if (!db) {
    return null;
  }

  try {
    const row = await db
      .prepare(
        `SELECT match_id, outcome, resolved_at, tx_hash, created_at
         FROM match_results
         WHERE match_id = ?`
      )
      .bind(matchId)
      .first<MatchResultRow>();

    return row ? toMatchResult(row) : null;
  } catch (error) {
    if (!isMissingMatchResultsTable(error)) {
      throw error;
    }
    return null;
  }
}

export async function getAllMatchResults(db: D1): Promise<readonly MatchResult[]> {
  if (!db) {
    return [];
  }

  try {
    const rows = await db
      .prepare(
        `SELECT match_id, outcome, resolved_at, tx_hash, created_at
         FROM match_results
         ORDER BY resolved_at DESC`
      )
      .all<MatchResultRow>();

    return (rows.results ?? []).flatMap((row) => {
      const result = toMatchResult(row);
      return result ? [result] : [];
    });
  } catch (error) {
    if (!isMissingMatchResultsTable(error)) {
      throw error;
    }
    return [];
  }
}