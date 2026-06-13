import type { StatsSnapshot } from "@project-ball/shared";
import { STABLECOINS, type StablecoinSymbol } from "@project-ball/shared";
import { formatUnits } from "viem";
import { statsSnapshot as demoStats, tokenVolumes as demoTokenVolumes } from "../data/stats";

export type TokenVolume = {
  readonly symbol: StablecoinSymbol;
  readonly amountUsd: string;
  readonly share: number;
};

type D1ResultRow = {
  readonly daily_active_users?: number;
  readonly monthly_active_users?: number;
  readonly transaction_count?: number;
  readonly unique_onchain_users?: number;
  readonly volume_usd?: string;
  readonly failed_transaction_rate?: string;
};

type BetConfirmationRow = {
  readonly bettor: string | null;
  readonly token: string | null;
  readonly amount: string | null;
  readonly normalized_amount: string | null;
  readonly created_at: string;
};

const dayMs = 24 * 60 * 60 * 1000;
const monthMs = 30 * dayMs;

function isMissingStatsTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("no such table: bet_confirmations") ||
    message.includes("no such table: stats_snapshots") ||
    message.includes('relation "bet_confirmations" does not exist') ||
    message.includes('relation "stats_snapshots" does not exist')
  );
}

function parseCreatedAt(value: string): number {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const time = new Date(normalized).getTime();
  return Number.isFinite(time) ? time : 0;
}

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

function formatNormalizedUsd(amount: bigint): string {
  const formatted = formatUnits(amount, 18);
  const numeric = Number.parseFloat(formatted);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : formatted;
}

function tokenSymbolForAddress(address: string | null | undefined): StablecoinSymbol | null {
  if (!address) {
    return null;
  }

  const normalized = address.toLowerCase();
  const token = STABLECOINS.find(
    (candidate) =>
      candidate.mainnetAddress.toLowerCase() === normalized ||
      candidate.sepoliaAddress?.toLowerCase() === normalized
  );

  return token?.symbol ?? null;
}

export async function getBetRows(db: D1Database): Promise<readonly BetConfirmationRow[]> {
  const rows = await db
    .prepare(
      `SELECT bettor, token, amount, COALESCE(normalized_amount, amount) AS normalized_amount, created_at
       FROM bet_confirmations
       ORDER BY created_at DESC`
    )
    .all<BetConfirmationRow>();

  return rows.results ?? [];
}

async function getLatestSnapshot(db: D1Database): Promise<StatsSnapshot | null> {
  const row = await db
    .prepare(
      `SELECT daily_active_users, monthly_active_users, transaction_count, unique_onchain_users, volume_usd, failed_transaction_rate
       FROM stats_snapshots
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .first<D1ResultRow>();

  if (!row) {
    return null;
  }

  return {
    dailyActiveUsers: row.daily_active_users ?? 0,
    monthlyActiveUsers: row.monthly_active_users ?? 0,
    transactionCount: row.transaction_count ?? 0,
    uniqueOnchainUsers: row.unique_onchain_users ?? 0,
    volumeUsd: row.volume_usd ?? "0.00",
    failedTransactionRate: row.failed_transaction_rate ?? "0%"
  };
}

function statsFromBetRows(rows: readonly BetConfirmationRow[]): StatsSnapshot {
  const now = Date.now();
  const dailyUsers = new Set<string>();
  const monthlyUsers = new Set<string>();
  const allUsers = new Set<string>();
  const volume = rows.reduce((total, row) => total + toBigIntAmount(row.normalized_amount ?? row.amount), 0n);

  for (const row of rows) {
    const bettor = row.bettor?.toLowerCase();
    if (!bettor) {
      continue;
    }

    const createdAt = parseCreatedAt(row.created_at);
    allUsers.add(bettor);

    if (createdAt > 0 && now - createdAt <= dayMs) {
      dailyUsers.add(bettor);
    }

    if (createdAt > 0 && now - createdAt <= monthMs) {
      monthlyUsers.add(bettor);
    }
  }

  return {
    dailyActiveUsers: dailyUsers.size,
    monthlyActiveUsers: monthlyUsers.size,
    transactionCount: rows.length,
    uniqueOnchainUsers: allUsers.size,
    volumeUsd: formatNormalizedUsd(volume),
    failedTransactionRate: "0%"
  };
}

export async function getStats(env?: RuntimeEnv, preFetchedRows?: readonly BetConfirmationRow[]): Promise<StatsSnapshot> {
  const db = env?.PROJECT_BALL_DB;

  if (!db) {
    return demoStats;
  }

  try {
    const rows = preFetchedRows ?? await getBetRows(db);
    if (rows.length > 0) {
      return statsFromBetRows(rows);
    }

    return (await getLatestSnapshot(db)) ?? demoStats;
  } catch (error) {
    if (!isMissingStatsTable(error)) {
      throw error;
    }

    return demoStats;
  }
}

export async function getTokenVolumes(env?: RuntimeEnv, preFetchedRows?: readonly BetConfirmationRow[]): Promise<readonly TokenVolume[]> {
  const db = env?.PROJECT_BALL_DB;

  if (!db) {
    return demoTokenVolumes;
  }

  try {
    const rows = preFetchedRows ?? await getBetRows(db);
    if (rows.length === 0) {
      return demoTokenVolumes;
    }

    const amounts = new Map<StablecoinSymbol, bigint>(
      STABLECOINS.map((token) => [token.symbol, 0n])
    );

    for (const row of rows) {
      const symbol = tokenSymbolForAddress(row.token);
      if (!symbol) {
        continue;
      }

      amounts.set(symbol, (amounts.get(symbol) ?? 0n) + toBigIntAmount(row.normalized_amount ?? row.amount));
    }

    const total = [...amounts.values()].reduce((sum, amount) => sum + amount, 0n);

    return STABLECOINS.map((token) => {
      const amount = amounts.get(token.symbol) ?? 0n;
      const share = total > 0n ? Number((amount * 100n) / total) : 0;

      return {
        symbol: token.symbol,
        amountUsd: formatNormalizedUsd(amount),
        share
      };
    });
  } catch (error) {
    if (!isMissingStatsTable(error)) {
      throw error;
    }

    return demoTokenVolumes;
  }
}
