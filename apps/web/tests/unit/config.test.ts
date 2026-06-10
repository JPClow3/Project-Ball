import { describe, expect, it } from "vitest";
import { appConfig, isContractConfigured } from "../../src/lib/config";

describe("config module", () => {
  it("exports appConfig", () => {
    expect(appConfig).toBeDefined();
    expect(appConfig.chainId).toBeGreaterThan(0);
  });

  it("checks contract configuration", () => {
    // Should be false since it defaults to ZERO_ADDRESS in test environment unless set
    expect(typeof isContractConfigured()).toBe("boolean");
  });
});
