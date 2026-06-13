import { describe, expect, it } from "vitest";
import { renderMatchCard } from "../../src/lib/render";
import { emptyMatchPoolSnapshot } from "../../src/data/betting";

const worldCupOpener = {
  id: "wc26-400021443",
  homeTeam: "México",
  awayTeam: "África do Sul",
  kickoffIso: "2026-06-11T19:00:00Z",
  status: "open",
  poolUsd: emptyMatchPoolSnapshot.poolUsd,
  homeFlagCode: "mx",
  awayFlagCode: "za",
  homeCountry: "México",
  awayCountry: "África do Sul"
} as const;

describe("renderMatchCard", () => {
  it("renders open match actions", () => {
    const html = renderMatchCard({
      ...worldCupOpener
    });

    expect(html).toContain("México x África do Sul");
    expect(html).toContain("data-place-bet");
    expect(html).toContain("data-select-outcome");
    expect(html).not.toContain("data-select-token");
    expect(html).toContain("México vence");
    expect(html).toContain("Confirmar palpite");
    expect(html).toContain("data-stake-container hidden");
    expect(html).toContain("disabled hidden data-place-bet");
    expect(html).toContain("data-bet-status");
    expect(html).toContain("data-stake-error");
    expect(html).toContain('aria-invalid="false"');
  });

  it("marks a registered pick", () => {
    const html = renderMatchCard({
      ...worldCupOpener,
      userPick: "HOME"
    });

    expect(html).toContain("Palpite registrado");
    expect(html).toContain("México vence");
    expect(html).toContain("Confirmado");
    expect(html).toContain("data-confirmed-panel");
  });

  it("renders locked matches without active betting controls", () => {
    const html = renderMatchCard({
      ...worldCupOpener,
      status: "locked"
    });

    expect(html).toContain("Palpites encerrados");
    expect(html).toContain("Travado");
    expect(html).not.toContain("data-place-bet");
    expect(html).not.toContain("Palpite registrado");
  });
});
