import { expect, test } from "@playwright/test";

test("lighthouse-style local quality simulation", async ({ page, request }) => {
  test.setTimeout(90_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  const response = await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  expect(response?.ok()).toBe(true);
  await page.waitForFunction(() => Boolean((window as Window & { jonakinhoReady?: boolean }).jonakinhoReady));

  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: "Jonakinho",
    start_url: "/",
    display: "standalone"
  });

  const audit = await page.evaluate(() => {
    function isVisible(element: Element): boolean {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }

    function accessibleName(element: Element): string {
      const labelledBy = element.getAttribute("aria-labelledby");
      const labelledByText = labelledBy
        ?.split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .join(" ")
        .trim();
      const input = element as HTMLInputElement;
      return (
        element.getAttribute("aria-label") ??
        labelledByText ??
        element.getAttribute("title") ??
        input.labels?.[0]?.textContent?.trim() ??
        element.textContent?.trim() ??
        input.value ??
        ""
      );
    }

    const controls = [...document.querySelectorAll("a, button, input, select, textarea")].filter(isVisible);
    const unnamedControls = controls
      .filter((element) => accessibleName(element).length === 0)
      .map((element) => element.outerHTML.slice(0, 120));
    const smallTargets = [
      ...document.querySelectorAll(
        "[data-place-bet], [data-select-outcome], [data-select-stake], [data-select-token], [data-theme-toggle], [data-filter-chip], [data-group-tab]"
      )
    ]
      .filter(isVisible)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 36 || rect.height < 36;
      })
      .map((element) => accessibleName(element) || element.outerHTML.slice(0, 80));
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

    return {
      descriptionLength: document.querySelector('meta[name="description"]')?.getAttribute("content")?.length ?? 0,
      hasViewport: document
        .querySelector('meta[name="viewport"]')
        ?.getAttribute("content")
        ?.includes("width=device-width") ?? false,
      hasManifest: Boolean(document.querySelector('link[rel="manifest"]')),
      hasThemeColor: Boolean(document.querySelector('meta[name="theme-color"]')),
      h1Count: document.querySelectorAll("h1").length,
      allImagesHaveAlt: [...document.images].every((image) => image.hasAttribute("alt")),
      unnamedControls,
      smallTargets,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      matchCardCount: document.querySelectorAll("[data-match-card]").length,
      domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd ?? 0)
    };
  });

  expect(audit.descriptionLength).toBeGreaterThan(20);
  expect(audit.hasViewport).toBe(true);
  expect(audit.hasManifest).toBe(true);
  expect(audit.hasThemeColor).toBe(true);
  expect(audit.h1Count).toBe(1);
  expect(audit.allImagesHaveAlt).toBe(true);
  expect(audit.unnamedControls).toEqual([]);
  expect(audit.smallTargets).toEqual([]);
  expect(audit.horizontalOverflow).toBe(false);
  expect(audit.matchCardCount).toBe(72);
  expect(audit.domContentLoadedMs).toBeLessThan(15_000);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
