import { createWalletClient, hexToString, http, parseEventLogs, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoSepolia } from "viem/chains";
import { projectBallPoolsAbi, type Outcome } from "@project-ball/shared";
import dotenv from "dotenv";
import { getMatches } from "../src/data/matches";
import { getDatabase } from "../src/lib/db";
import { recordMatchResult } from "../src/lib/match-results";
import { refreshLeaderboardCache } from "../src/lib/leaderboard";
import {
  fetchApiFootballResults,
  fetchFootballDataResults,
  matchProviderResult,
  type MatchedProviderResult
} from "../src/lib/result-providers";

dotenv.config();

const chainId = Number(process.env.PUBLIC_CHAIN_ID || celoSepolia.id);
const chain = chainId === celo.id ? celo : celoSepolia;
const rpcUrl = process.env.PUBLIC_CELO_RPC_URL || chain.rpcUrls.default.http[0];
const poolsAddress = process.env.PUBLIC_PROJECT_BALL_POOLS_ADDRESS as `0x${string}` | undefined;
const oraclePrivateKey = process.env.ORACLE_PRIVATE_KEY as `0x${string}` | undefined;
const appMode = process.env.APP_MODE === "production" ? "production" : "development";
const pollIntervalMs = Number(process.env.RESULTS_POLL_INTERVAL_MS ?? 10 * 60 * 1000);
const autoEnabled = process.env.RESULTS_AUTO_ENABLED !== "false";

const outcomeToOnchain: Record<Outcome, number> = {
  HOME: 1,
  DRAW: 2,
  AWAY: 3
};

const onchainOutcomeToOutcome: Record<number, Outcome> = {
  1: "HOME",
  2: "DRAW",
  3: "AWAY"
};

function requireProductionConfig(): void {
  if (appMode !== "production") {
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for production oracle runs");
  }
  if (!poolsAddress || /^0x0{40}$/i.test(poolsAddress)) {
    throw new Error("PUBLIC_PROJECT_BALL_POOLS_ADDRESS is required for production oracle runs");
  }
  if (!oraclePrivateKey) {
    throw new Error("ORACLE_PRIVATE_KEY is required for production oracle runs");
  }
  if (!process.env.API_FOOTBALL_KEY && !process.env.FOOTBALL_DATA_API_TOKEN) {
    throw new Error("At least one results provider API key is required for production oracle runs");
  }
}

async function fetchFinishedResults(): Promise<readonly MatchedProviderResult[]> {
  const matches = getMatches();
  const providerResults = [];

  if (process.env.API_FOOTBALL_KEY) {
    try {
      providerResults.push(...await fetchApiFootballResults(process.env.API_FOOTBALL_KEY));
    } catch (error) {
      console.error("[Oracle] API-Football fetch failed:", error);
    }
  }

  if (providerResults.length === 0 && process.env.FOOTBALL_DATA_API_TOKEN) {
    try {
      providerResults.push(...await fetchFootballDataResults(process.env.FOOTBALL_DATA_API_TOKEN));
    } catch (error) {
      console.error("[Oracle] Football-Data fetch failed:", error);
    }
  }

  return providerResults.flatMap((result) => {
    const matched = matchProviderResult(matches, result);
    if (!matched) {
      console.warn(`[Oracle] Could not uniquely match provider fixture ${result.provider}:${result.providerFixtureId}`);
      return [];
    }
    return [matched];
  });
}

async function resolveOnchain(result: MatchedProviderResult): Promise<`0x${string}` | null> {
  if (!poolsAddress || /^0x0{40}$/i.test(poolsAddress) || !oraclePrivateKey) {
    if (appMode === "production") {
      throw new Error("Contract and oracle key are required in production");
    }
    return null;
  }

  const account = privateKeyToAccount(oraclePrivateKey);
  const client = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  }).extend(publicActions);
  const onchainId = result.match.onchainId;
  if (!onchainId) {
    throw new Error(`Missing on-chain id for ${result.match.id}`);
  }

  const { request } = await client.simulateContract({
    address: poolsAddress,
    abi: projectBallPoolsAbi,
    functionName: "resolveMatch",
    args: [onchainId, outcomeToOnchain[result.outcome]]
  });

  const txHash = await client.writeContract(request);
  const receipt = await client.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
  if (receipt.status !== "success") {
    throw new Error(`resolveMatch failed for ${result.match.id}`);
  }

  const logs = parseEventLogs({
    abi: projectBallPoolsAbi,
    logs: receipt.logs,
    eventName: "MatchResolved"
  });
  const resolved = logs.find((log) => log.address.toLowerCase() === poolsAddress.toLowerCase());
  if (!resolved) {
    throw new Error(`Missing MatchResolved event for ${result.match.id}`);
  }

  const resolvedMatchId = hexToString(resolved.args.matchId).replace(/\0+$/g, "");
  const resolvedOutcome = onchainOutcomeToOutcome[Number(resolved.args.result)];
  if (resolvedMatchId !== result.match.id || resolvedOutcome !== result.outcome) {
    throw new Error(`MatchResolved event mismatch for ${result.match.id}`);
  }

  return txHash;
}

async function runOracle(): Promise<void> {
  if (!autoEnabled) {
    console.log("[Oracle] RESULTS_AUTO_ENABLED=false; skipping.");
    return;
  }

  requireProductionConfig();
  const db = getDatabase();
  if (!db) {
    if (appMode === "production") {
      throw new Error("Database unavailable for production oracle run");
    }
    console.warn("[Oracle] Database unavailable; skipping result persistence.");
    return;
  }

  const results = await fetchFinishedResults();
  let recordedAny = false;
  for (const result of results) {
    try {
      const txHash = await resolveOnchain(result);
      await recordMatchResult(db, {
        matchId: result.match.id,
        outcome: result.outcome,
        txHash,
        provider: result.provider,
        providerFixtureId: result.providerFixtureId,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        sourceUpdatedAt: result.sourceUpdatedAt,
        reconciliationStatus: txHash ? "reconciled" : "pending"
      });
      recordedAny = true;
      console.log(`[Oracle] Recorded ${result.match.id} ${result.homeScore}-${result.awayScore}`);
    } catch (error) {
      console.error(`[Oracle] Failed processing ${result.match.id}:`, error);
    }
  }

  if (recordedAny) {
    await refreshLeaderboardCache(db);
  }
}

async function pollOracle(isInitialRun = false): Promise<void> {
  try {
    await runOracle();
  } catch (error) {
    console.error(isInitialRun ? "[Oracle] Initial run failed:" : "[Oracle] Run failed:", error);
    if (isInitialRun && appMode === "production") {
      process.exit(1);
    }
  }

  setTimeout(() => {
    void pollOracle();
  }, pollIntervalMs);
}

void pollOracle(true);
