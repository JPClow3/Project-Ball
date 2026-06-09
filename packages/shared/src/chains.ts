export const CELO_MAINNET = {
  id: 42220,
  name: "Celo Mainnet",
  rpcUrl: "https://forno.celo.org",
  explorerUrl: "https://celoscan.io"
} as const;

export const CELO_SEPOLIA = {
  id: 11142220,
  name: "Celo Sepolia",
  rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
  explorerUrl: "https://celo-sepolia.blockscout.com"
} as const;

export type CeloChainId = typeof CELO_MAINNET.id | typeof CELO_SEPOLIA.id;
