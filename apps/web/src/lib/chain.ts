import { projectBallPoolsAbi, type Outcome } from "@project-ball/shared";
import { createPublicClient, hexToString, http, parseEventLogs } from "viem";
import { celo, celoSepolia } from "viem/chains";
import { appConfig, isContractConfigured } from "./config";

export type BetConfirmation = {
  readonly matchId: string;
  readonly outcome?: Outcome;
  readonly bettor?: `0x${string}`;
  readonly token?: `0x${string}`;
  readonly amount?: string;
  readonly normalizedAmount?: string;
};

type MatchResolution = {
  readonly matchId: string;
  readonly outcome: Outcome;
  readonly txHash: string;
};

const outcomeById: Record<number, Outcome> = {
  1: "HOME",
  2: "DRAW",
  3: "AWAY"
};

function getPublicClient() {
  return createPublicClient({
    chain: appConfig.chainId === celo.id ? celo : celoSepolia,
    transport: http(appConfig.celoRpcUrl)
  });
}

export async function confirmBetTransaction(txHash: `0x${string}`): Promise<BetConfirmation | null> {
  if (!isContractConfigured()) {
    return null;
  }

  const client = getPublicClient();
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    timeout: 20_000 // 20 s
  });

  if (receipt.status !== "success") {
    return null;
  }

  const logs = parseEventLogs({
    abi: projectBallPoolsAbi,
    logs: receipt.logs,
    eventName: "BetPlaced"
  });

  const betLog = logs.find((log) => log.address.toLowerCase() === appConfig.poolsAddress.toLowerCase());

  if (!betLog) {
    return null;
  }

  const matchId = hexToString(betLog.args.matchId).replace(/\0+$/g, "");
  const outcomeId = Number(betLog.args.outcome);

  return {
    matchId,
    outcome: outcomeById[outcomeId],
    bettor: betLog.args.bettor,
    token: betLog.args.token,
    amount: betLog.args.amount.toString(),
    normalizedAmount: betLog.args.normalizedAmount.toString()
  };
}

async function listenForMatchResolved(txHash: `0x${string}`): Promise<MatchResolution | null> {
  if (!isContractConfigured()) {
    return null;
  }

  const client = getPublicClient();
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    timeout: 20_000 // 20 s
  });

  if (receipt.status !== "success") {
    return null;
  }

  const logs = parseEventLogs({
    abi: projectBallPoolsAbi,
    logs: receipt.logs,
    eventName: "MatchResolved"
  });

  const resolveLog = logs.find((log) => log.address.toLowerCase() === appConfig.poolsAddress.toLowerCase());

  if (!resolveLog) {
    return null;
  }

  const matchId = hexToString(resolveLog.args.matchId).replace(/\0+$/g, "");
  const outcomeId = Number(resolveLog.args.result);

  return {
    matchId,
    outcome: outcomeById[outcomeId],
    txHash
  };
}