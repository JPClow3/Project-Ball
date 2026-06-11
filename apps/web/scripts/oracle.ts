import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoSepolia } from "viem/chains";
import { projectBallPoolsAbi } from "@project-ball/shared";
import dotenv from "dotenv";

dotenv.config();

const chainId = Number(process.env.PUBLIC_CHAIN_ID || celoSepolia.id);
const chain = chainId === celo.id ? celo : celoSepolia;
const rpcUrl = process.env.PUBLIC_CELO_RPC_URL || chain.rpcUrls.default.http[0];
const poolsAddress = process.env.PUBLIC_PROJECT_BALL_POOLS_ADDRESS as `0x${string}`;

const oraclePrivateKey = process.env.ORACLE_PRIVATE_KEY as `0x${string}`;

if (!oraclePrivateKey || !poolsAddress) {
  console.error("Missing ORACLE_PRIVATE_KEY or PUBLIC_PROJECT_BALL_POOLS_ADDRESS");
  process.exit(1);
}

const account = privateKeyToAccount(oraclePrivateKey);

const client = createWalletClient({
  account,
  chain,
  transport: http(rpcUrl)
}).extend(publicActions);

async function resolveMatch(matchIdStr: string, homeScore: number, awayScore: number) {
  const matchId = matchIdStr as `0x${string}`; // Assuming bytes32 format
  let result = 2; // DRAW
  if (homeScore > awayScore) result = 1; // HOME
  else if (awayScore > homeScore) result = 3; // AWAY

  try {
    const { request } = await client.simulateContract({
      address: poolsAddress,
      abi: projectBallPoolsAbi,
      functionName: "resolveMatch",
      args: [matchId, result],
    });
    
    const hash = await client.writeContract(request);
    console.log(`Resolved match ${matchId} (Result: ${result}). Tx: ${hash}`);
  } catch (err) {
    console.error(`Failed to resolve match ${matchId}:`, err);
  }
}

// In a real implementation, you would poll a football API (like API-Football)
// and call resolveMatch for finished matches.
async function runOracle() {
  console.log("Oracle starting...");
  // Example call: await resolveMatch("0x...", 2, 1);
  console.log("Oracle finished check.");
}

setInterval(runOracle, 10 * 60 * 1000);
runOracle();
