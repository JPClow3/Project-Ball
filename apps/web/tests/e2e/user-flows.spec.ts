import { expect, test, type Page } from "@playwright/test";

async function waitForProjectBall(page: Page) {
  await page.waitForFunction(() => Boolean((window as Window & { projectBallReady?: boolean }).projectBallReady));
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
    await waitForProjectBall(page);

    const firstCard = page.locator('[data-match-card][data-match-id="wc26-400021443"]');
    const confirmButton = firstCard.getByRole("button", { name: "Confirmar palpite" });
    const customStake = firstCard.getByRole("spinbutton", { name: "Valor personalizado" });

    await firstCard.getByRole("radio", { name: "México vence" }).click();
    await expect(confirmButton).toBeEnabled();

    await customStake.fill("1");
    await expect(confirmButton).toBeDisabled();
    await expect(customStake).toHaveAttribute("aria-invalid", "true");
    await expect(firstCard.locator("[data-stake-error]")).toContainText("Informe pelo menos $2.");

    await customStake.fill("2");
    await expect(confirmButton).toBeEnabled();
    await expect(customStake).toHaveAttribute("aria-invalid", "false");
    await expect(firstCard.locator("[data-stake-error]")).toBeHidden();

    await firstCard.getByRole("radio", { name: "$10" }).click();
    await expect(customStake).toHaveValue("10");
    await expect(confirmButton).toBeEnabled();
  });

  test("bet confirmation locks the card while confirmation is pending", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForProjectBall(page);

    let releaseConfirmation!: () => void;
    let markConfirmationStarted!: () => void;
    const confirmationStarted = new Promise<void>((resolve) => {
      markConfirmationStarted = resolve;
    });
    const confirmationGate = new Promise<void>((resolve) => {
      releaseConfirmation = resolve;
    });

    await page.route("**/api/confirm-bet", async (route) => {
      markConfirmationStarted();
      await confirmationGate;
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: '<article data-match-card data-match-id="wc26-400021443">Palpite registrado</article>'
      });
    });

    const firstCard = page.locator('[data-match-card][data-match-id="wc26-400021443"]');
    const confirmButton = firstCard.locator("[data-place-bet]");

    await firstCard.getByRole("radio", { name: "México vence" }).click();
    await expect(confirmButton).toBeEnabled();

    await confirmButton.click();
    await confirmationStarted;

    await expect(firstCard).toHaveAttribute("data-bet-pending", "");
    await expect(firstCard).toHaveAttribute("aria-busy", "true");
    await page.waitForTimeout(100);
    await expect(firstCard.locator("[data-loading-card].htmx-indicator")).toHaveCount(0);
    await page.waitForTimeout(250);
    await expect(firstCard.locator("[data-loading-card].htmx-indicator")).toHaveCount(1);
    await expect(firstCard.locator(".loading-progress")).toBeHidden();
    await page.waitForTimeout(1700);
    await expect(firstCard.locator("[data-loading-card]")).toHaveAttribute("data-show-progress", "true");
    await expect(firstCard.locator(".loading-progress")).toBeVisible();
    await expect(firstCard.getByRole("radio", { name: "México vence" })).toBeDisabled();
    await expect(confirmButton).toBeDisabled();

    releaseConfirmation();
    await expect(firstCard).toContainText("Palpite registrado");
  });

  test("filters keep the board navigable and do not introduce overflow", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForProjectBall(page);

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
    await waitForProjectBall(page);

    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    const expected = before === "light" ? "dark" : "light";
    const toggleLabel = before === "light" ? "Usar modo escuro" : "Usar modo claro";

    await page.getByRole("button", { name: toggleLabel }).click();
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await waitForProjectBall(page).catch(() => undefined);
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
