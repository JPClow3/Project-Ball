import type { Outcome } from "@project-ball/shared";
import type { MatchViewModel } from "../data/matches";

export type ResultProviderName = "api-football" | "football-data";

export type ProviderMatchResult = {
  readonly provider: ResultProviderName;
  readonly providerFixtureId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoffIso: string;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly sourceUpdatedAt: string;
};

export type MatchedProviderResult = ProviderMatchResult & {
  readonly match: MatchViewModel;
  readonly outcome: Outcome;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function outcomeFromScore(homeScore: number, awayScore: number): Outcome {
  if (homeScore > awayScore) return "HOME";
  if (awayScore > homeScore) return "AWAY";
  return "DRAW";
}

function isWithinKickoffWindow(leftIso: string, rightIso: string): boolean {
  const diffMs = Math.abs(new Date(leftIso).getTime() - new Date(rightIso).getTime());
  return Number.isFinite(diffMs) && diffMs <= 8 * 60 * 60 * 1000;
}

export function matchProviderResult(
  matches: readonly MatchViewModel[],
  result: ProviderMatchResult
): MatchedProviderResult | null {
  const homeName = normalizeName(result.homeTeam);
  const awayName = normalizeName(result.awayTeam);
  const candidates = matches.filter((match) => {
    const matchHome = normalizeName(match.providerHomeTeam ?? match.homeTeam);
    const matchAway = normalizeName(match.providerAwayTeam ?? match.awayTeam);
    return matchHome === homeName && matchAway === awayName && isWithinKickoffWindow(match.kickoffIso, result.kickoffIso);
  });

  if (candidates.length !== 1) {
    return null;
  }

  return {
    ...result,
    match: candidates[0],
    outcome: outcomeFromScore(result.homeScore, result.awayScore)
  };
}

export async function fetchApiFootballResults(apiKey: string, url = process.env.API_FOOTBALL_FIXTURES_URL): Promise<readonly ProviderMatchResult[]> {
  const endpoint = url || "https://v3.football.api-sports.io/fixtures?league=1&season=2026";
  const response = await fetch(endpoint, {
    headers: {
      "x-apisports-key": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`API-Football returned ${response.status}`);
  }

  const payload = asRecord(await response.json());
  const fixtures = Array.isArray(payload.response) ? payload.response : [];
  return fixtures.flatMap((item): ProviderMatchResult[] => {
    const row = asRecord(item);
    const fixture = asRecord(row.fixture);
    const status = asRecord(fixture.status);
    if (!["FT", "AET", "PEN"].includes(text(status.short))) {
      return [];
    }

    const teams = asRecord(row.teams);
    const goals = asRecord(row.goals);
    const homeScore = numberValue(goals.home);
    const awayScore = numberValue(goals.away);
    if (homeScore === null || awayScore === null) {
      return [];
    }

    return [
      {
        provider: "api-football",
        providerFixtureId: String(fixture.id ?? ""),
        homeTeam: text(asRecord(teams.home).name),
        awayTeam: text(asRecord(teams.away).name),
        kickoffIso: text(fixture.date),
        homeScore,
        awayScore,
        sourceUpdatedAt: new Date().toISOString()
      }
    ];
  });
}

export async function fetchFootballDataResults(apiToken: string, url = process.env.FOOTBALL_DATA_MATCHES_URL): Promise<readonly ProviderMatchResult[]> {
  const endpoint = url || "https://api.football-data.org/v4/competitions/WC/matches?season=2026";
  const response = await fetch(endpoint, {
    headers: {
      "X-Auth-Token": apiToken
    }
  });

  if (!response.ok) {
    throw new Error(`Football-Data.org returned ${response.status}`);
  }

  const payload = asRecord(await response.json());
  const matches = Array.isArray(payload.matches) ? payload.matches : [];
  return matches.flatMap((item): ProviderMatchResult[] => {
    const row = asRecord(item);
    if (text(row.status) !== "FINISHED") {
      return [];
    }

    const score = asRecord(row.score);
    const fullTime = asRecord(score.fullTime);
    const homeScore = numberValue(fullTime.home);
    const awayScore = numberValue(fullTime.away);
    if (homeScore === null || awayScore === null) {
      return [];
    }

    return [
      {
        provider: "football-data",
        providerFixtureId: String(row.id ?? ""),
        homeTeam: text(asRecord(row.homeTeam).name),
        awayTeam: text(asRecord(row.awayTeam).name),
        kickoffIso: text(row.utcDate),
        homeScore,
        awayScore,
        sourceUpdatedAt: text(row.lastUpdated) || new Date().toISOString()
      }
    ];
  });
}
