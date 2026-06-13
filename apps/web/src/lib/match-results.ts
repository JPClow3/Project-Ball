import type { Outcome } from "@project-ball/shared";
import { isProductionMode } from "./config";

type D1 = RuntimeEnv["PROJECT_BALL_DB"];

export type MatchResult = {
  readonly matchId: string;
  readonly outcome: Outcome;
  readonly resolvedAt: string;
  readonly txHash?: string;
  readonly provider?: string;
  readonly providerFixtureId?: string;
  readonly homeScore?: number;
  readonly awayScore?: number;
  readonly sourceUpdatedAt?: string;
  readonly reconciliationStatus?: "pending" | "reconciled" | "failed" | "manual";
};

type MatchResultRow = {
  readonly match_id: string;
  readonly outcome: string;
  readonly resolved_at: string;
  readonly tx_hash: string | null;
  readonly provider: string | null;
  readonly provider_fixture_id: string | null;
  readonly home_score: number | null;
  readonly away_score: number | null;
  readonly source_updated_at: string | null;
  readonly reconciliation_status: string | null;
  readonly created_at: string;
};

export type RecordMatchResultOptions = {
  readonly matchId: string;
  readonly outcome: Outcome;
  readonly txHash?: string | null;
  readonly provider?: string | null;
  readonly providerFixtureId?: string | null;
  readonly homeScore?: number | null;
  readonly awayScore?: number | null;
  readonly sourceUpdatedAt?: string | null;
  readonly reconciliationStatus?: MatchResult["reconciliationStatus"];
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
    txHash: row.tx_hash ?? undefined,
    provider: row.provider ?? undefined,
    providerFixtureId: row.provider_fixture_id ?? undefined,
    homeScore: row.home_score ?? undefined,
    awayScore: row.away_score ?? undefined,
    sourceUpdatedAt: row.source_updated_at ?? undefined,
    reconciliationStatus: (row.reconciliation_status as MatchResult["reconciliationStatus"]) ?? undefined
  };
}

function isMissingMatchResultsTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("no such table: match_results") ||
    message.includes('relation "match_results" does not exist')
  );
}

export async function recordMatchResult(db: D1, options: RecordMatchResultOptions): Promise<void> {
  if (!db) {
    if (isProductionMode()) {
      throw new Error("Match result database is required when APP_MODE=production");
    }
    console.warn("Database unavailable. Cannot record match result.");
    return;
  }

  try {
    await db
      .prepare(
        `INSERT INTO match_results (
           match_id, outcome, tx_hash, provider, provider_fixture_id, home_score, away_score, source_updated_at, reconciliation_status
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (match_id) DO UPDATE SET
           outcome = excluded.outcome,
           tx_hash = excluded.tx_hash,
           provider = excluded.provider,
           provider_fixture_id = excluded.provider_fixture_id,
           home_score = excluded.home_score,
           away_score = excluded.away_score,
           source_updated_at = excluded.source_updated_at,
           reconciliation_status = excluded.reconciliation_status,
           resolved_at = CURRENT_TIMESTAMP`
      )
      .bind(
        options.matchId,
        options.outcome,
        options.txHash ?? null,
        options.provider ?? null,
        options.providerFixtureId ?? null,
        options.homeScore ?? null,
        options.awayScore ?? null,
        options.sourceUpdatedAt ?? null,
        options.reconciliationStatus ?? "pending"
      )
      .run();
  } catch (error) {
    if (!isMissingMatchResultsTable(error)) {
      throw error;
    }
    if (isProductionMode()) {
      throw error;
    }
    console.warn("match_results table does not exist. Run migration 0004.");
  }
}

export async function getMatchResult(db: D1, matchId: string): Promise<MatchResult | null> {
  if (!db) {
    return null;
  }

  try {
    const row = await db
      .prepare(
        `SELECT match_id, outcome, resolved_at, tx_hash, provider, provider_fixture_id, home_score, away_score, source_updated_at, reconciliation_status, created_at
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
        `SELECT match_id, outcome, resolved_at, tx_hash, provider, provider_fixture_id, home_score, away_score, source_updated_at, reconciliation_status, created_at
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
