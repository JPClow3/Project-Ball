import { STABLECOINS } from "@project-ball/shared";
import { describe, expect, it } from "vitest";
import { getStats, getTokenVolumes } from "../../src/lib/stats";

type BetRow = {
  readonly bettor: string;
  readonly token: string;
  readonly amount: string;
  readonly created_at: string;
};

function makeEnv(rows: readonly BetRow[]): RuntimeEnv {
  const statement: D1PreparedStatement = {
    bind: () => statement,
    first: async <T = unknown>() => null as T | null,
    all: async <T = unknown>() => ({ results: [...rows] as T[] }),
    run: async () => ({})
  };

  return ({
    PROJECT_BALL_DB: {
      prepare: () => statement
    }
  } as unknown) as RuntimeEnv;
}

describe("stats reads", () => {
  it("computes Proof-of-Ship stats from verified bet confirmations", async () => {
    const usdm = STABLECOINS.find((token) => token.symbol === "USDm");
    const usdc = STABLECOINS.find((token) => token.symbol === "USDC");
    const now = new Date().toISOString();
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const env = makeEnv([
      {
        bettor: "0x1111111111111111111111111111111111111111",
        token: usdc?.mainnetAddress ?? "",
        amount: "1000000000000000000",
        created_at: now
      },
      {
        bettor: "0x2222222222222222222222222222222222222222",
        token: usdm?.mainnetAddress ?? "",
        amount: "2000000000000000000",
        created_at: now
      },
      {
        bettor: "0x1111111111111111111111111111111111111111",
        token: usdc?.mainnetAddress ?? "",
        amount: "3000000000000000000",
        created_at: old
      }
    ]);

    const stats = await getStats(env);
    const tokenVolumes = await getTokenVolumes(env);
    const usdmVolume = tokenVolumes.find((token) => token.symbol === "USDm");
    const usdcVolume = tokenVolumes.find((token) => token.symbol === "USDC");

    expect(stats).toMatchObject({
      dailyActiveUsers: 2,
      monthlyActiveUsers: 2,
      transactionCount: 3,
      uniqueOnchainUsers: 2,
      volumeUsd: "6.00",
      failedTransactionRate: "0%"
    });
    expect(usdmVolume).toMatchObject({ amountUsd: "2.00", share: 33 });
    expect(usdcVolume).toMatchObject({ amountUsd: "4.00", share: 66 });
  });
});
