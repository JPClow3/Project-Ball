import { expect, test } from "@playwright/test";
import { CELO_SEPOLIA } from "@project-ball/shared";

test("mobile home renders match cards and local confirmation flow", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Football without.*the fluff\./ })).toBeVisible();
  await page.waitForFunction(() => Boolean((window as Window & { projectBallReady?: boolean }).projectBallReady));
  await expect
    .poll(() => page.evaluate(() => typeof (window as Window & { htmx?: { swap?: unknown } }).htmx?.swap))
    .toBe("function");

  const firstCard = page.locator('[data-match-card][data-match-id="wc26-400021443"]');
  await expect(firstCard).toContainText("México x África do Sul");
  await expect(firstCard).toContainText("Valor USDC");
  await expect(firstCard.locator("[data-select-token]")).toHaveCount(0);
  await expect(firstCard.getByAltText("Bandeira: México")).toBeVisible();
  await expect(firstCard.getByAltText("Bandeira: África do Sul")).toBeVisible();
  await expect(firstCard.locator("[data-place-bet]")).toBeDisabled();
  await firstCard.getByRole("radio", { name: "México vence" }).click();
  await expect(firstCard).not.toContainText("Palpite registrado");
  await expect(firstCard.locator("[data-place-bet]")).toBeEnabled();
  const confirmationResponse = page.waitForResponse(
    (response) => response.url().includes("/api/confirm-bet") && response.status() === 200,
    { timeout: 60_000 }
  );
  await firstCard.locator("[data-place-bet]").click();
  await confirmationResponse;
  await expect(firstCard).toContainText("Palpite registrado", { timeout: 60_000 });
  await expect(firstCard).toContainText("México vence");
  await expect(firstCard).toHaveAttribute("data-confirmed", "true");

  const hasNoHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );
  expect(hasNoHorizontalOverflow).toBe(true);
});

test("failed bet shows inline status and toast", async ({ page }) => {
  await page.route("**/api/confirm-bet", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "text/plain; charset=utf-8",
      body: "Falha de rede temporária"
    });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean((window as Window & { projectBallReady?: boolean }).projectBallReady));

  const firstCard = page.locator('[data-match-card][data-match-id="wc26-400021443"]');
  await firstCard.getByRole("radio", { name: "México vence" }).click();
  await firstCard.locator("[data-place-bet]").click();

  await expect(firstCard.locator("[data-bet-status]")).toContainText("Falha de rede");
  await expect(page.locator("[data-toast]").filter({ hasText: "Falha de rede" })).toBeVisible();
  await expect(firstCard.getByRole("button", { name: "Tentar de novo" })).toBeEnabled();
});

test("offline bet attempt shows a visible retry path", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean((window as Window & { projectBallReady?: boolean }).projectBallReady));

  const firstCard = page.locator('[data-match-card][data-match-id="wc26-400021443"]');
  await firstCard.getByRole("radio", { name: "México vence" }).click();
  await expect(firstCard.locator("[data-place-bet]")).toBeEnabled();

  await page.context().setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await firstCard.locator("[data-place-bet]").click();

  await expect(firstCard.locator("[data-bet-status]")).toContainText("Sem conexão");
  await expect(page.locator("[data-toast]").filter({ hasText: "Verifique a rede" })).toBeVisible();
  await expect(firstCard.locator("[data-place-bet]")).toBeEnabled();

  await page.context().setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
});

test("MiniPay login creates a no-sign session", async ({ page }) => {
  const miniPayAddress = "0x4444444444444444444444444444444444444444";
  const chainHex = `0x${CELO_SEPOLIA.id.toString(16)}`;

  await page.addInitScript(
    ({ address, chainIdHex }) => {
      Object.defineProperty(window, "ethereum", {
        configurable: true,
        value: {
          isMiniPay: true,
          request: async ({ method }: { method: string }) => {
            if (method === "eth_chainId") {
              return chainIdHex;
            }

            if (method === "eth_requestAccounts") {
              return [address];
            }

            throw new Error(`Unexpected MiniPay method: ${method}`);
          }
        }
      });
    },
    { address: miniPayAddress, chainIdHex: chainHex }
  );

  await page.goto("/login?next=/meus-palpites", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Entrar com carteira" }).click();
  await expect(page).toHaveURL(/\/meus-palpites$/);
  await expect(page.getByRole("heading", { level: 1, name: "Palpites" })).toBeVisible();
  await expect(page.locator("[data-auth-user]").first()).toBeVisible();
});

test("home and match cards render in both themes", async ({ page }) => {
  for (const theme of ["dark", "light"] as const) {
    await page.addInitScript((selectedTheme) => {
      window.localStorage.setItem("project-ball-theme", selectedTheme);
    }, theme);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean((window as Window & { projectBallReady?: boolean }).projectBallReady));

    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
    await expect(page.getByRole("heading", { name: /Football without.*the fluff\./ })).toBeVisible();

    const firstCard = page.locator('[data-match-card][data-match-id="wc26-400021443"]');
    await expect(firstCard).toBeVisible();
    await expect(firstCard.getByRole("radio", { name: "México vence" })).toBeVisible();
    await expect(firstCard.locator("[data-bet-status]")).toHaveCount(1);

    const hasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    );
    expect(hasNoHorizontalOverflow).toBe(true);
  }
});
