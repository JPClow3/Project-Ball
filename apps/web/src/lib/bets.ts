import type { Outcome } from "@project-ball/shared";

type D1 = RuntimeEnv["PROJECT_BALL_DB"];

export type BetConfirmationRecord = {
  readonly txHash: `0x${string}`;
  readonly matchId: string;
  readonly bettor: `0x${string}` | null;
  readonly outcome: Outcome | null;
  readonly token: `0x${string}` | null;
  readonly amount: string | null;
};

export type ConfirmedPick = {
  readonly txHash: `0x${string}`;
  readonly matchId: string;
  readonly outcome: Outcome;
  readonly createdAt: string;
};

type StoredBetConfirmation = BetConfirmationRecord & {
  readonly createdAt: string;
};

type BetStore = {
  readonly confirmations: Map<string, StoredBetConfirmation>;
};

type ConfirmedPickRow = {
  readonly tx_hash: string;
  readonly match_id: string;
  readonly outcome: string | null;
  readonly created_at: string;
};

const fallbackStore = globalThis as typeof globalThis & {
  __projectBallBetStore?: BetStore;
};

function getMemoryStore(): BetStore {
  fallbackStore.__projectBallBetStore ??= {
    confirmations: new Map()
  };

  return fallbackStore.__projectBallBetStore;
}

function nowIso(): string {
  return new Date().toISOString();
}

function isMissingBetTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("no such table: bet_confirmations");
}

function isOutcome(value: unknown): value is Outcome {
  return value === "HOME" || value === "DRAW" || value === "AWAY";
}

function toConfirmedPick(row: ConfirmedPickRow): ConfirmedPick | null {
  if (!isOutcome(row.outcome) || !row.tx_hash.startsWith("0x")) {
    return null;
  }

  return {
    txHash: row.tx_hash as `0x${string}`,
    matchId: row.match_id,
    outcome: row.outcome,
    createdAt: row.created_at
  };
}

export async function recordBetConfirmation(db: D1, confirmation: BetConfirmationRecord): Promise<void> {
  if (db) {
    try {
      await db
        .prepare(
          `INSERT OR IGNORE INTO bet_confirmations (tx_hash, match_id, bettor, outcome, token, amount)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          confirmation.txHash,
          confirmation.matchId,
          confirmation.bettor,
          confirmation.outcome,
          confirmation.token,
          confirmation.amount
        )
        .run();
      return;
    } catch (error) {
      if (!isMissingBetTable(error)) {
        throw error;
      }
    }
  }

  getMemoryStore().confirmations.set(confirmation.txHash, {
    ...confirmation,
    createdAt: nowIso()
  });
}

export async function getUserConfirmedPicks(
  db: D1,
  walletAddress: `0x${string}`
): Promise<readonly ConfirmedPick[]> {
  if (db) {
    try {
      const rows = await db
        .prepare(
          `SELECT tx_hash, match_id, outcome, created_at
           FROM bet_confirmations
           WHERE bettor IS NOT NULL
             AND lower(bettor) = ?
             AND outcome IN ('HOME', 'DRAW', 'AWAY')
           ORDER BY created_at DESC`
        )
        .bind(walletAddress.toLowerCase())
        .all<ConfirmedPickRow>();

      return (rows.results ?? []).flatMap((row) => {
        const pick = toConfirmedPick(row);
        return pick ? [pick] : [];
      });
    } catch (error) {
      if (!isMissingBetTable(error)) {
        throw error;
      }
    }
  }

  return [...getMemoryStore().confirmations.values()]
    .filter(
      (confirmation) =>
        confirmation.bettor?.toLowerCase() === walletAddress.toLowerCase() &&
        isOutcome(confirmation.outcome)
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((confirmation) => ({
      txHash: confirmation.txHash,
      matchId: confirmation.matchId,
      outcome: confirmation.outcome as Outcome,
      createdAt: confirmation.createdAt
    }));
}
