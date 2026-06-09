import { CELO_SEPOLIA } from "@project-ball/shared";
import { isAddress } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const rawChainId = Number(import.meta.env.PUBLIC_CHAIN_ID ?? CELO_SEPOLIA.id);
const validatedChainId = Number.isFinite(rawChainId) && rawChainId > 0 ? rawChainId : CELO_SEPOLIA.id;

export const appConfig = {
  appName: import.meta.env.PUBLIC_APP_NAME ?? "Project Ball",
  appUrl: import.meta.env.PUBLIC_APP_URL ?? "http://localhost:4321",
  chainId: validatedChainId,
  celoRpcUrl: import.meta.env.PUBLIC_CELO_RPC_URL ?? CELO_SEPOLIA.rpcUrl,
  celoExplorerUrl: import.meta.env.PUBLIC_CELO_EXPLORER_URL ?? CELO_SEPOLIA.explorerUrl,
  poolsAddress: (import.meta.env.PUBLIC_PROJECT_BALL_POOLS_ADDRESS ?? ZERO_ADDRESS) as `0x${string}`,
  supportUrl: import.meta.env.PUBLIC_SUPPORT_URL ?? "https://t.me/projectball_support"
} as const;

export function isContractConfigured(): boolean {
  return isAddress(appConfig.poolsAddress) &&
    appConfig.poolsAddress.toLowerCase() !== ZERO_ADDRESS;
}
