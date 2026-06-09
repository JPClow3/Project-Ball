import {
  CELO_SEPOLIA,
  getTokenAddress,
  STABLECOINS,
  type Stablecoin
} from "@project-ball/shared";

export function getConfiguredChainId(): number {
  const chainId = Number(import.meta.env.PUBLIC_CHAIN_ID ?? CELO_SEPOLIA.id);
  return Number.isFinite(chainId) ? chainId : CELO_SEPOLIA.id;
}

export function getAvailableStablecoins(chainId = getConfiguredChainId()): readonly Stablecoin[] {
  const availableTokens = STABLECOINS.filter((token) => getTokenAddress(token.symbol, chainId));
  return availableTokens.length > 0 ? availableTokens : STABLECOINS;
}

export function getDefaultStablecoin(chainId = getConfiguredChainId()): Stablecoin {
  return getAvailableStablecoins(chainId)[0] ?? STABLECOINS[0];
}
