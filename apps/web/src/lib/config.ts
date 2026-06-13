import { CELO_SEPOLIA } from "@project-ball/shared";
import { isAddress } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
export type AppMode = "development" | "production";

const rawChainId = Number(import.meta.env.PUBLIC_CHAIN_ID ?? CELO_SEPOLIA.id);
const validatedChainId = Number.isFinite(rawChainId) && rawChainId > 0 ? rawChainId : CELO_SEPOLIA.id;
const rawAppMode = process.env.APP_MODE ?? import.meta.env.APP_MODE ?? import.meta.env.PUBLIC_APP_MODE;
const appMode: AppMode = rawAppMode === "production" ? "production" : "development";

const VALID_CONFIGS = {
  42220: { name: 'Celo Mainnet', rpc: 'https://forno.celo.org' },
  11142220: { name: 'Celo Sepolia', rpc: 'https://forno.celo-sepolia.celo-testnet.org' },
} as const;

if (import.meta.env.PROD && !(validatedChainId in VALID_CONFIGS)) {
  throw new Error(`CRITICAL: Chain ID ${validatedChainId} is not in the allowed VALID_CONFIGS!`);
}

export const appConfig = {
  appName: import.meta.env.PUBLIC_APP_NAME ?? "Project Ball",
  appUrl: import.meta.env.PUBLIC_APP_URL ?? "http://localhost:4321",
  appMode,
  chainId: validatedChainId,
  celoRpcUrl: import.meta.env.PUBLIC_CELO_RPC_URL ?? CELO_SEPOLIA.rpcUrl,
  celoExplorerUrl: import.meta.env.PUBLIC_CELO_EXPLORER_URL ?? CELO_SEPOLIA.explorerUrl,
  poolsAddress: (import.meta.env.PUBLIC_PROJECT_BALL_POOLS_ADDRESS ?? ZERO_ADDRESS) as `0x${string}`,
  supportUrl: import.meta.env.PUBLIC_SUPPORT_URL ?? "https://t.me/projectball_support"
} as const;

export function isProductionMode(): boolean {
  return appConfig.appMode === "production" || import.meta.env.PROD || process.env.NODE_ENV === "production";
}

export function assertProductionReadyDatabase(db: RuntimeEnv["PROJECT_BALL_DB"]): asserts db is D1Database {
  if (isProductionMode() && !db) {
    throw new Error("PROJECT_BALL_DB/DATABASE_URL is required when APP_MODE=production");
  }
}

export function isContractConfigured(): boolean {
  return isAddress(appConfig.poolsAddress) &&
    appConfig.poolsAddress.toLowerCase() !== ZERO_ADDRESS;
}

export function assertProductionReadyContract(): void {
  if (isProductionMode() && !isContractConfigured()) {
    throw new Error("PUBLIC_PROJECT_BALL_POOLS_ADDRESS must be configured when APP_MODE=production");
  }
}
