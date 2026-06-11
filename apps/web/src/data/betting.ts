import type { Outcome } from "@project-ball/shared";

export const outcomeLabels: Record<Outcome, string> = {
  HOME: "Time 1",
  DRAW: "Empate",
  AWAY: "Time 2"
};

const outcomeColors: Record<Outcome, string> = {
  HOME: "bg-[#2563eb]",
  DRAW: "bg-[#7e22ce]",
  AWAY: "bg-[#0891b2]"
};

export const outcomeOnchainCodes: Record<Outcome, number> = {
  HOME: 1,
  DRAW: 2,
  AWAY: 3
};

const lowStakeUsd = 2;
const defaultStakeOptionUsd = 5;
const highStakeUsd = 10;

export const stakeOptionsUsd = [lowStakeUsd, defaultStakeOptionUsd, highStakeUsd] as const;
export const defaultStakeUsd = defaultStakeOptionUsd;
export const minimumStakeUsd = Math.min(...stakeOptionsUsd);
export const stakeStepUsd = 1;

export type OutcomeTotalsUsd = Record<Outcome, string>;

export type MatchPoolSnapshot = {
  readonly poolUsd: string;
  readonly supporterCount: number;
  readonly outcomeTotalsUsd: OutcomeTotalsUsd;
};

const emptyUsdAmount = "0.00";
const emptyCount = 0;

export const emptyOutcomeTotalsUsd: OutcomeTotalsUsd = {
  HOME: emptyUsdAmount,
  DRAW: emptyUsdAmount,
  AWAY: emptyUsdAmount
};

export const emptyMatchPoolSnapshot: MatchPoolSnapshot = {
  poolUsd: emptyUsdAmount,
  supporterCount: emptyCount,
  outcomeTotalsUsd: emptyOutcomeTotalsUsd
};

const matchPoolSnapshotsByFifaId: Readonly<Record<string, MatchPoolSnapshot>> = {};

export function getMatchPoolSnapshot(fifaId: string): MatchPoolSnapshot {
  return matchPoolSnapshotsByFifaId[fifaId] ?? emptyMatchPoolSnapshot;
}

export function getOutcomePoolShares(outcomeTotalsUsd: OutcomeTotalsUsd) {
  const outcomes = Object.keys(outcomeLabels) as Outcome[];
  const totalUsd = outcomes.reduce((total, outcome) => total + Number.parseFloat(outcomeTotalsUsd[outcome]), 0);

  return outcomes.map((outcome) => {
    const amountUsd = Number.parseFloat(outcomeTotalsUsd[outcome]);
    const share = totalUsd > 0 ? Math.round((amountUsd / totalUsd) * 100) : 0;

    return {
      outcome,
      label: outcomeLabels[outcome],
      share,
      color: outcomeColors[outcome]
    };
  });
}
