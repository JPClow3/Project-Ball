import { describe, expect, it } from "vitest";
import { emptyMatchPoolSnapshot } from "../../src/data/betting";
import type { MatchViewModel } from "../../src/data/matches";
import { renderMatchCard } from "../../src/lib/render";

describe("renderMatchCard security", () => {
  it("escapes team, venue, country, and flag values before rendering HTML", () => {
    const match = {
      id: "attack-card",
      homeTeam: '<script>alert("home")</script>',
      awayTeam: 'Away" onmouseover="alert(1)',
      kickoffIso: "2026-06-11T19:00:00Z",
      status: "open",
      poolUsd: emptyMatchPoolSnapshot.poolUsd,
      competition: 'Cup <img src=x onerror="alert(1)">',
      groupLabel: "Grupo <A>",
      venue: 'Stadium" autofocus onfocus="alert(1)',
      homeFlagCode: 'mx" onerror="alert(1)',
      awayFlagCode: "za",
      homeCountry: 'Mexico <svg onload="alert(1)">',
      awayCountry: "África do Sul",
      homeForm: [],
      awayForm: [],
      outcomeTotalsUsd: emptyMatchPoolSnapshot.outcomeTotalsUsd,
      supporterCount: 0
    } as const satisfies MatchViewModel;
    const html = renderMatchCard(match);

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<svg");
    expect(html).not.toContain('onmouseover="');
    expect(html).not.toContain('onfocus="');
    expect(html).not.toContain('onerror="');
    expect(html).toContain("&lt;script&gt;alert(&quot;home&quot;)&lt;/script&gt;");
    expect(html).toContain("Away&quot; onmouseover=&quot;alert(1)");
    expect(html).toContain("Grupo &lt;A&gt;");
  });
});
