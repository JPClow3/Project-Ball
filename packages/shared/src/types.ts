export type Outcome = "HOME" | "DRAW" | "AWAY";

export type MatchStatus = "open" | "locked" | "resolved" | "voided";

export type Match = {
  readonly id: string;
  readonly onchainId?: `0x${string}`;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoffIso: string;
  readonly status: MatchStatus;
  readonly poolUsd: string;
  readonly userPick?: Outcome;
};

export type StatsSnapshot = {
  readonly dailyActiveUsers: number;
  readonly monthlyActiveUsers: number;
  readonly transactionCount: number;
  readonly uniqueOnchainUsers: number;
  readonly volumeUsd: string;
  readonly failedTransactionRate: string;
};
