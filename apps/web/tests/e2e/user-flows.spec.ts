import { expect, test, type Page } from "@playwright/test";

async function waitForJonakinho(page: Page) {
  await page.waitForFunction(() => Boolean((window as Window & { jonakinhoReady?: boolean }).jonakinhoReady));
}

test.describe("user journeys and edge cases", () => {
  test("protected wallet pages redirect to login with a safe next path", async ({ page }) => {
    await page.goto("/meus-palpites", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login\?next=%2Fmeus-palpites$/);
    await expect(page.getByText("Entre para ver seus palpites")).toBeVisible();

    await page.goto("/login?next=//evil.example/path", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Criar conta nova" })).toHaveAttribute(
      "href",
      "/register?next=%2Fmeus-palpites"
    );
  });

  test("custom stake edge cases disable and re-enable confirmation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForJonakinho(page);

    const firstCard = page.locator('[data-match-card][data-match-id="wc26-400021443"]');
    const confirmButton = firstCard.getByRole("button", { name: "Confirmar palpite" });
    const customStake = firstCard.getByRole("spinbutton", { name: "Valor personalizado" });

    await firstCard.getByRole("radio", { name: "México vence" }).click();
    await expect(confirmButton).toBeEnabled();

    await customStake.fill("1");
    await expect(confirmButton).toBeDisabled();

    await customStake.fill("2");
    await expect(confirmButton).toBeEnabled();

    await firstCard.getByRole("radio", { name: "$10" }).click();
    await expect(customStake).toHaveValue("10");
    await expect(confirmButton).toBeEnabled();
  });

  test("filters keep the board navigable and do not introduce overflow", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForJonakinho(page);

    await page.getByRole("button", { name: "Brasil" }).click();
    const visibleCards = page.locator("[data-match-card]:visible");
    const visibleText = await visibleCards.allTextContents();

    expect(visibleText.length).toBeGreaterThan(0);
    expect(visibleText.every((text) => text.includes("Brasil"))).toBe(true);
    await expect(page.locator("[data-filter-empty]:visible")).toHaveCount(0);

    const hasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    );
    expect(hasNoHorizontalOverflow).toBe(true);
  });

  test("theme toggle persists across reloads", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForJonakinho(page);

    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    const expected = before === "light" ? "dark" : "light";
    const toggleLabel = before === "light" ? "Usar modo escuro" : "Usar modo claro";

    await page.getByRole("button", { name: toggleLabel }).click();
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await waitForJonakinho(page).catch(() => undefined);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe(expected);

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe(expected);
  });
});
