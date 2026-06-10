import { describe, expect, it } from "vitest";
import { formatUsd, formatKickoff, formatKickoffFull, getOutcomeTone } from "../../src/lib/format";

describe("format module", () => {
  it("formats USD correctly", () => {
    expect(formatUsd(10.5)).toContain("10,50");
    expect(formatUsd("20")).toContain("20,00");
  });

  it("formats kickoff dates", () => {
    const iso = "2024-06-15T15:00:00Z";
    const shortDate = formatKickoff(iso);
    expect(shortDate).toBeTruthy();
    
    const fullDate = formatKickoffFull(iso);
    expect(fullDate).toBeTruthy();
  });

  it("gets outcome tone", () => {
    expect(getOutcomeTone("HOME")).toBe("outcome-tone-home");
    expect(getOutcomeTone("DRAW")).toBe("outcome-tone-draw");
    expect(getOutcomeTone("AWAY")).toBe("outcome-tone-away");
  });
});
