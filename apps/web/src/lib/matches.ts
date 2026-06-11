import type { Match, Outcome, StatsSnapshot } from "@project-ball/shared";
import type { MatchViewModel } from "../data/matches";
import { matches } from "../data/matches";
import { statsSnapshot } from "../data/stats";

const demoMatches = matches;

const demoStats: StatsSnapshot = statsSnapshot;

export function getMatch(matchId: string): MatchViewModel | undefined {
  return demoMatches.find((match) => match.id === matchId || match.onchainId === matchId);
}

export function withUserPick<T extends Match>(match: T, outcome?: Outcome): T {
  return outcome ? ({ ...match, userPick: outcome } as T) : match;
}

function isLastChance(iso: string, now = new Date()): boolean {
  const diffMs = new Date(iso).getTime() - now.getTime();
  return diffMs > 0 && diffMs <= 60 * 60 * 1000;
}
