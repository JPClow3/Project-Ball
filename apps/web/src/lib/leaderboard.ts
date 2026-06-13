import { formatUnits } from "viem";
import { getAllMatchResults } from "./match-results";

type D1 = RuntimeEnv["PROJECT_BALL_DB"];

export type LeaderboardEntry = {
  readonly walletAddress: string;
  readonly displayName?: string;
  readonly totalBets: number;
  readonly correctBets: number;
  readonly accuracyPercentage: number;
  readonly totalWonUsd: number;
  readonly combinedScore: number;
  readonly rank?: number;
};

type UserLeaderboardRow = {
  readonly wallet_address: string;
  readonly display_name: string | null;
  readonly total_bets: number;
  readonly correct_bets: number;
  readonly accuracy_percentage: number;
  readonly total_won_usd: number;
  readonly combined_score: number;
  readonly updated_at: string;
};

type WalletUserRow = {
  readonly wallet_address: string;
  readonly display_name: string | null;
};

const defaultTotalFeeBps = 500n;
const bpsDenominator = 10_000n;

function toBigIntAmount(value: string | null | undefined): bigint {
  if (!value) {
    return 0n;
  }

  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function payoutForStake(options: {
  readonly stakeNormalized: bigint;
  readonly matchTotalNormalized: bigint;
  readonly winnerNormalized: bigint;
}): bigint {
  if (options.stakeNormalized <= 0n || options.matchTotalNormalized <= 0n || options.winnerNormalized <= 0n) {
    return 0n;
  }

  const distributable = (options.matchTotalNormalized * (bpsDenominator - defaultTotalFeeBps)) / bpsDenominator;
  return (distributable * options.stakeNormalized) / options.winnerNormalized;
}

function formatNormalizedUsd(amount: bigint): number {
  const formatted = formatUnits(amount, 18);
  const numeric = Number.parseFloat(formatted);
  return Number.isFinite(numeric) ? numeric : 0;
}

function isMissingLeaderboardTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("no such table: user_leaderboard") ||
    message.includes('relation "user_leaderboard" does not exist')
  );
}

function isMissingMatchResultsTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("no such table: match_results") ||
    message.includes('relation "match_results" does not exist')
  );
}

async function getUserDisplayNames(db: D1): Promise<Map<string, string>> {
  if (!db) {
    return new Map();
  }

  try {
    const rows = await db
      .prepare(`SELECT wallet_address, display_name FROM wallet_users`)
      .all<WalletUserRow>();

    const displayNames = new Map<string, string>();
    for (const row of rows.results ?? []) {
      if (row.display_name) {
        displayNames.set(row.wallet_address.toLowerCase(), row.display_name);
      }
    }
    return displayNames;
  } catch (error) {
    // Table might not exist in older migrations
    return new Map();
  }
}



export async function refreshLeaderboardCache(db: D1): Promise<void> {
  if (!db) {
    console.warn("Database unavailable. Cannot refresh leaderboard cache.");
    return;
  }

  try {
    // Get all match results
    const matchResults = await getAllMatchResults(db);
    const matchResultMap = new Map(matchResults.map((mr) => [mr.matchId, mr]));

    // Get all unique bettors
    const bettorsResult = await db
      .prepare(
        `SELECT DISTINCT lower(bettor) as bettor
         FROM bet_confirmations
         WHERE bettor IS NOT NULL`
      )
      .all<{ bettor: string }>();

    const bettors = (bettorsResult.results ?? []).map((row) => row.bettor);
    const displayNames = await getUserDisplayNames(db);

    // Initialize user stats map
    type MutableStats = {
      walletAddress: string;
      displayName?: string;
      totalBets: number;
      correctBets: number;
      accuracyPercentage: number;
      totalWonUsd: number;
      combinedScore: number;
    };
    const userStats: Map<string, MutableStats> = new Map();
    for (const bettor of bettors) {
      userStats.set(bettor, {
        walletAddress: bettor,
        displayName: displayNames.get(bettor),
        totalBets: 0,
        correctBets: 0,
        accuracyPercentage: 0,
        totalWonUsd: 0,
        combinedScore: 0 // Will calculate after
      });
    }

    // Fetch all bets with outcomes in a single query (fixes N+1 issue)
    const betsResult = await db
      .prepare(
        `SELECT lower(bettor) as bettor, match_id, outcome, amount, COALESCE(normalized_amount, amount) AS normalized_amount
         FROM bet_confirmations
         WHERE bettor IS NOT NULL
           AND outcome IN ('HOME', 'DRAW', 'AWAY')`
      )
      .all<{ bettor: string; match_id: string; outcome: string; amount: string | null; normalized_amount: string | null }>();

    const bets = betsResult.results ?? [];
    const poolStats = new Map<string, { totalNormalized: bigint; winnerNormalized: bigint }>();
    for (const bet of bets) {
      const matchResult = matchResultMap.get(bet.match_id);
      const stakeNormalized = toBigIntAmount(bet.normalized_amount ?? bet.amount);
      const pool = poolStats.get(bet.match_id) ?? { totalNormalized: 0n, winnerNormalized: 0n };
      pool.totalNormalized += stakeNormalized;
      if (matchResult && matchResult.outcome === bet.outcome) {
        pool.winnerNormalized += stakeNormalized;
      }
      poolStats.set(bet.match_id, pool);
    }

    // Process all bets in memory
    for (const bet of bets) {
      const stats = userStats.get(bet.bettor);
      if (!stats) continue;

      stats.totalBets++;
      const matchResult = matchResultMap.get(bet.match_id);

      if (matchResult && matchResult.outcome === bet.outcome) {
        stats.correctBets++;
        const pool = poolStats.get(bet.match_id);
        stats.totalWonUsd += formatNormalizedUsd(
          payoutForStake({
            stakeNormalized: toBigIntAmount(bet.normalized_amount ?? bet.amount),
            matchTotalNormalized: pool?.totalNormalized ?? 0n,
            winnerNormalized: pool?.winnerNormalized ?? 0n
          })
        );
      }
    }

    // Calculate max winnings for normalization (using log10 to mitigate "whales")
    let maxWonUsdLog = 0;
    for (const stats of userStats.values()) {
      stats.accuracyPercentage = stats.totalBets > 0 ? (stats.correctBets / stats.totalBets) * 100 : 0;
      const wonLog = Math.log10(stats.totalWonUsd + 1);
      if (wonLog > maxWonUsdLog) {
        maxWonUsdLog = wonLog;
      }
    }

    // Calculate combined scores and update database
    const statements = [];
    for (const [bettor, stats] of userStats) {
      // 60% weight on accuracy, 40% weight on normalized log winnings
      const normalizedWinnings = maxWonUsdLog > 0 ? (Math.log10(stats.totalWonUsd + 1) / maxWonUsdLog) * 100 : 0;
      stats.combinedScore = (stats.accuracyPercentage * 0.6) + (normalizedWinnings * 0.4);

      statements.push(
        db.prepare(
          `INSERT INTO user_leaderboard (wallet_address, display_name, total_bets, correct_bets, accuracy_percentage, total_won_usd, combined_score)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (wallet_address) DO UPDATE SET
             display_name = excluded.display_name,
             total_bets = excluded.total_bets,
             correct_bets = excluded.correct_bets,
             accuracy_percentage = excluded.accuracy_percentage,
             total_won_usd = excluded.total_won_usd,
             combined_score = excluded.combined_score,
             updated_at = CURRENT_TIMESTAMP`
        ).bind(
          bettor,
          stats.displayName ?? null,
          stats.totalBets,
          stats.correctBets,
          stats.accuracyPercentage,
          stats.totalWonUsd,
          stats.combinedScore
        )
      );
    }

    if (statements.length > 0) {
      // Execute in batches to avoid D1 limits
      for (let i = 0; i < statements.length; i += 50) {
        await db.batch(statements.slice(i, i + 50));
      }
    }

    // Leaderboard cache refreshed successfully
  } catch (error) {
    if (!isMissingLeaderboardTable(error) && !isMissingMatchResultsTable(error)) {
      throw error;
    }
    console.warn("Leaderboard tables do not exist. Run migration 0004.");
  }
}

export async function getLeaderboard(
  db: D1,
  limit: number = 50
): Promise<readonly LeaderboardEntry[]> {
  if (!db) {
    return [];
  }

  try {
    const rows = await db
      .prepare(
        `SELECT wallet_address, display_name, total_bets, correct_bets, accuracy_percentage, total_won_usd, combined_score
         FROM user_leaderboard
         ORDER BY combined_score DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<UserLeaderboardRow>();

    return (rows.results ?? []).map((row, index) => ({
      walletAddress: row.wallet_address,
      displayName: row.display_name ?? undefined,
      totalBets: row.total_bets,
      correctBets: row.correct_bets,
      accuracyPercentage: row.accuracy_percentage,
      totalWonUsd: row.total_won_usd,
      combinedScore: row.combined_score,
      rank: index + 1
    }));
  } catch (error) {
    if (!isMissingLeaderboardTable(error)) {
      throw error;
    }
    console.warn("user_leaderboard table does not exist. Run migration 0004.");
    return [];
  }
}

async function getUserLeaderboardEntry(
  db: D1,
  walletAddress: string
): Promise<LeaderboardEntry | null> {
  if (!db) {
    return null;
  }

  try {
    const row = await db
      .prepare(
        `SELECT wallet_address, display_name, total_bets, correct_bets, accuracy_percentage, total_won_usd, combined_score
         FROM user_leaderboard
         WHERE wallet_address = ?`
      )
      .bind(walletAddress.toLowerCase())
      .first<UserLeaderboardRow>();

    if (!row) {
      return null;
    }

    // Get rank
    const rankResult = await db
      .prepare(
        `SELECT COUNT(*) as rank
         FROM user_leaderboard
         WHERE combined_score > ?`
      )
      .bind(row.combined_score)
      .first<{ rank: number }>();

    const rank = (rankResult?.rank ?? 0) + 1;

    return {
      walletAddress: row.wallet_address,
      displayName: row.display_name ?? undefined,
      totalBets: row.total_bets,
      correctBets: row.correct_bets,
      accuracyPercentage: row.accuracy_percentage,
      totalWonUsd: row.total_won_usd,
      combinedScore: row.combined_score,
      rank
    };
  } catch (error) {
    if (!isMissingLeaderboardTable(error)) {
      throw error;
    }
    return null;
  }
}
