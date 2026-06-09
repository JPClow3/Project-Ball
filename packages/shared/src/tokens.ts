export type StablecoinSymbol = "USDm" | "USDC" | "USDT";

export type Stablecoin = {
  readonly symbol: StablecoinSymbol;
  readonly label: string;
  readonly decimals: 6 | 18;
  readonly mainnetAddress: `0x${string}`;
  readonly mainnetFeeCurrency: `0x${string}`;
  readonly sepoliaAddress: `0x${string}` | null;
  readonly sepoliaFeeCurrency: `0x${string}` | null;
};

export const STABLECOINS = [
  {
    symbol: "USDm",
    label: "USDm",
    decimals: 18,
    mainnetAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    mainnetFeeCurrency: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    sepoliaAddress: null,
    sepoliaFeeCurrency: null
  },
  {
    symbol: "USDC",
    label: "USDC",
    decimals: 6,
    mainnetAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    mainnetFeeCurrency: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
    sepoliaAddress: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
    sepoliaFeeCurrency: "0x4822e58de6f5e485eF90df51C41CE01721331dC0"
  },
  {
    symbol: "USDT",
    label: "USDT",
    decimals: 6,
    mainnetAddress: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    mainnetFeeCurrency: "0x0e2A3e05bc9A16F5292A6170456a710cb89C6f72",
    sepoliaAddress: null,
    sepoliaFeeCurrency: null
  }
] as const satisfies readonly Stablecoin[];

export function getStablecoin(symbol: StablecoinSymbol): Stablecoin {
  const token = STABLECOINS.find((candidate) => candidate.symbol === symbol);

  if (!token) {
    throw new Error(`Unsupported stablecoin: ${symbol}`);
  }

  return token;
}

export function getTokenAddress(symbol: StablecoinSymbol, chainId: number): `0x${string}` | null {
  const token = getStablecoin(symbol);
  return chainId === 42220 ? token.mainnetAddress : token.sepoliaAddress;
}

export function getFeeCurrencyAddress(symbol: StablecoinSymbol, chainId: number): `0x${string}` | null {
  const token = getStablecoin(symbol);
  return chainId === 42220 ? token.mainnetFeeCurrency : token.sepoliaFeeCurrency;
}
