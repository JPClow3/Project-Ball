import type { StatsSnapshot } from "@jonakinho/shared";
import { STABLECOINS } from "@jonakinho/shared";

const emptyCount = 0;
const emptyUsdAmount = "0.00";
const emptyRate = "0%";

export const statsSnapshot: StatsSnapshot = {
  dailyActiveUsers: emptyCount,
  monthlyActiveUsers: emptyCount,
  transactionCount: emptyCount,
  uniqueOnchainUsers: emptyCount,
  volumeUsd: emptyUsdAmount,
  failedTransactionRate: emptyRate
};

export const tokenVolumes = STABLECOINS.map((token) => ({
  symbol: token.symbol,
  amountUsd: emptyUsdAmount,
  share: emptyCount
}));
