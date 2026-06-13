import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirmBetTransaction: vi.fn(),
  recordBetConfirmation: vi.fn()
}));

vi.mock("../../src/lib/runtime", () => ({
  getRuntimeEnv: () => ({
    PROJECT_BALL_DB: undefined
  })
}));

vi.mock("../../src/lib/auth", () => ({
  getSession: vi.fn(async () => null)
}));

vi.mock("../../src/lib/bets", () => ({
  recordBetConfirmation: mocks.recordBetConfirmation
}));

vi.mock("../../src/lib/config", () => ({
  isContractConfigured: () => true,
  isProductionMode: () => false
}));

vi.mock("../../src/lib/chain", () => ({
  confirmBetTransaction: mocks.confirmBetTransaction
}));

vi.mock("@/lib/cache", () => ({
  deleteCache: vi.fn(async () => undefined)
}));

const txHash = `0x${"a".repeat(64)}` as const;
const bettor = "0x1111111111111111111111111111111111111111" as const;

describe("confirm bet API", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("records a verified on-chain bet even when the match has since locked", async () => {
    mocks.confirmBetTransaction.mockResolvedValue({
      matchId: "wc26-400021443",
      outcome: "HOME",
      bettor,
      token: "0x2222222222222222222222222222222222222222",
      amount: "1000000",
      normalizedAmount: "1000000000000000000"
    });

    const { POST } = await import("../../src/pages/api/confirm-bet");
    const response = await POST({
      request: new Request("https://projectball.example/api/confirm-bet", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          txHash,
          matchId: "wc26-400021443",
          outcome: "HOME"
        })
      })
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(mocks.recordBetConfirmation).toHaveBeenCalledWith(undefined, {
      txHash,
      matchId: "wc26-400021443",
      bettor,
      outcome: "HOME",
      token: "0x2222222222222222222222222222222222222222",
      amount: "1000000",
      normalizedAmount: "1000000000000000000"
    });
  });
});
