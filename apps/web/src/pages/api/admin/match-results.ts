import type { APIRoute } from "astro";
import type { Outcome } from "@project-ball/shared";
import { getRuntimeEnv } from "@/lib/runtime";
import { getMatch } from "@/lib/matches";
import { isProductionMode } from "@/lib/config";
import { recordMatchResult } from "@/lib/match-results";
import { refreshLeaderboardCache } from "@/lib/leaderboard";

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers
    }
  });
}

function isOutcome(value: unknown): value is Outcome {
  return value === "HOME" || value === "DRAW" || value === "AWAY";
}

function isTxHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export const POST: APIRoute = async ({ request }) => {
  const env = getRuntimeEnv();
  const adminSecret = process.env.ADMIN_SECRET ?? env.ADMIN_SECRET;
  const authHeader = request.headers.get("Authorization");

  if (isProductionMode() && !adminSecret) {
    return json({ error: "ADMIN_SECRET is required" }, { status: 500 });
  }

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const matchId = typeof payload?.matchId === "string" ? payload.matchId : "";
  const outcome = payload?.outcome;
  const txHash = payload?.txHash;
  const match = getMatch(matchId);

  if (!match || !isOutcome(outcome)) {
    return json({ error: "Invalid match result" }, { status: 400 });
  }

  let reconciliationStatus: "manual" | "reconciled" = "manual";
  if (txHash !== undefined) {
    if (!isTxHash(txHash)) {
      return json({ error: "Invalid txHash" }, { status: 400 });
    }

    const { confirmMatchResolvedTransaction } = await import("@/lib/chain");
    const resolution = await confirmMatchResolvedTransaction(txHash);
    if (!resolution || resolution.matchId !== match.id || resolution.outcome !== outcome) {
      return json({ error: "MatchResolved event does not match payload" }, { status: 400 });
    }
    reconciliationStatus = "reconciled";
  }

  await recordMatchResult(env.PROJECT_BALL_DB, {
    matchId: match.id,
    outcome,
    txHash: isTxHash(txHash) ? txHash : null,
    provider: "admin",
    reconciliationStatus
  });
  await refreshLeaderboardCache(env.PROJECT_BALL_DB);

  return json({ success: true });
};
