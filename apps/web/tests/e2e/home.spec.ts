import { expect, test, type Page } from "@playwright/test";
import { CELO_SEPOLIA } from "@project-ball/shared";

function firstOpenCard(page: Page) {
  return page.locator('[data-match-card][data-match-status="open"]:visible').first();
}

async function stableFirstOpenCard(page: Page) {
  const firstOpen = firstOpenCard(page);
  const matchId = await firstOpen.getAttribute("data-match-id");
  expect(matchId).toBeTruthy();
  return page.locator(`[data-match-card][data-match-id="${matchId}"]`);
}

test("mobile home renders match cards and local confirmation flow", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Futebol sem enrolação." })).toBeVisible();
  await page.waitForFunction(() => Boolean((window as Window & { projectBallReady?: boolean }).projectBallReady));
  await expect
    .poll(() => page.evaluate(() => typeof (window as Window & { htmx?: { swap?: unknown } }).htmx?.swap))
    .toBe("function");

  const firstCard = await stableFirstOpenCard(page);
  await expect(firstCard).toContainText("Aberto");
  await expect(firstCard.locator("[data-select-token]")).toHaveCount(0);
  await expect(firstCard.locator("[data-stake-container]")).not.toBeVisible();
  await expect(firstCard.locator("[data-place-bet]")).not.toBeVisible();
  await firstCard.locator('[data-select-outcome][data-outcome="HOME"]').click();
  await expect(firstCard).not.toContainText("Palpite registrado");
  await expect(firstCard.locator("[data-stake-container]")).toBeVisible();
  await expect(firstCard.locator("[data-place-bet]")).toBeEnabled();
  const confirmationResponse = page.waitForResponse(
    (response) => response.url().includes("/api/confirm-bet") && response.status() === 200,
    { timeout: 60_000 }
  );
  await firstCard.locator("[data-place-bet]").click();
  await confirmationResponse;
  await expect(firstCard).toContainText("Palpite registrado", { timeout: 60_000 });
  await expect(firstCard).toHaveAttribute("data-confirmed", "true");

  const hasNoHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );
  expect(hasNoHorizontalOverflow).toBe(true);
});

test("mobile chrome keeps the betting board action-first", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean((window as Window & { projectBallReady?: boolean }).projectBallReady));

  const navLinks = page.locator(".mobile-nav [data-nav-link]");
  await expect(navLinks).toHaveCount(4);
  await expect(page.locator(".mobile-nav").getByRole("link", { name: "Suporte" })).toHaveCount(0);

  const layout = await page.evaluate(() => {
    const nav = document.querySelector(".mobile-nav")?.getBoundingClientRect();
    const board = document.querySelector("#match-board")?.getBoundingClientRect();
    const hero = document.querySelector("[data-home-hero]")?.getBoundingClientRect();
    const firstCard = document.querySelector("[data-match-card]")?.getBoundingClientRect();
    return {
      navHeight: nav?.height ?? 0,
      boardTop: board?.top ?? Number.POSITIVE_INFINITY,
      heroTop: hero?.top ?? Number.POSITIVE_INFINITY,
      firstCardTop: firstCard?.top ?? Number.POSITIVE_INFINITY,
      viewportHeight: window.innerHeight
    };
  });

  expect(layout.navHeight).toBeLessThanOrEqual(76);
  expect(layout.boardTop).toBeLessThan(layout.heroTop);
  expect(layout.firstCardTop).toBeLessThan(layout.viewportHeight);

  const firstCard = await stableFirstOpenCard(page);
  await firstCard.scrollIntoViewIfNeeded();
  await firstCard.locator('[data-select-outcome][data-outcome="HOME"]').click();
  const placeBetButton = firstCard.locator("[data-place-bet]");
  await expect(placeBetButton).toBeVisible();
  await placeBetButton.evaluate((button) => button.scrollIntoView({ block: "center", inline: "nearest" }));

  await expect
    .poll(() =>
      firstCard.locator("[data-place-bet]").evaluate((button) => {
        const header = document.querySelector("header")?.getBoundingClientRect();
        const nav = document.querySelector(".mobile-nav")?.getBoundingClientRect();
        const buttonBounds = button.getBoundingClientRect();
        if (!header || !nav) return true;
        return buttonBounds.top < header.bottom || buttonBounds.bottom > nav.top;
      })
    )
    .toBe(false);
});

test("core public routes do not emit push subscription console errors", async ({ page }) => {
  const messages: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      messages.push(msg.text());
    }
  });

  for (const route of ["/", "/login", "/ranking", "/support"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);
  }

  expect(messages.filter((message) => /ServiceWorker registration failed|pushManager|PushManager|subscribe/i.test(message))).toEqual([]);
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

  const firstCard = await stableFirstOpenCard(page);
  await firstCard.locator('[data-select-outcome][data-outcome="HOME"]').click();
  await expect(firstCard.locator("[data-place-bet]")).toBeEnabled();
  await firstCard.locator("[data-place-bet]").click();

  await expect(firstCard.locator("[data-bet-status]")).toContainText("Falha de rede");
  await expect(page.locator("[data-toast]").filter({ hasText: "Falha de rede" })).toBeVisible();
  await expect(firstCard.getByRole("button", { name: "Tentar de novo" })).toBeEnabled();
});

test("offline bet attempt shows a visible retry path", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean((window as Window & { projectBallReady?: boolean }).projectBallReady));

  const firstCard = await stableFirstOpenCard(page);
  await firstCard.locator('[data-select-outcome][data-outcome="HOME"]').click();
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

test("MiniPay login requires a wallet signature", async ({ page }) => {
  const miniPayAddress = "0x4444444444444444444444444444444444444444";
  const chainHex = `0x${CELO_SEPOLIA.id.toString(16)}`;
  let miniPayEndpointCalled = false;

  await page.route("**/api/auth/minipay", async (route) => {
    miniPayEndpointCalled = true;
    await route.fulfill({ status: 500, body: "must not be called" });
  });

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

            if (method === "personal_sign") {
              throw new Error("Signature required");
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
  await expect(page.locator("[data-auth-status]")).toContainText("Signature required");
  expect(miniPayEndpointCalled).toBe(false);
});

test("home and match cards render in both themes", async ({ page }) => {
  for (const theme of ["dark", "light"] as const) {
    await page.addInitScript((selectedTheme) => {
      window.localStorage.setItem("project-ball-theme", selectedTheme);
    }, theme);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean((window as Window & { projectBallReady?: boolean }).projectBallReady));

    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
    await expect(page.getByRole("heading", { name: "Futebol sem enrolação." })).toBeVisible();

    const firstCard = firstOpenCard(page);
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator('[data-select-outcome][data-outcome="HOME"]')).toBeVisible();
    await expect(firstCard.locator("[data-bet-status]")).toHaveCount(1);

    const hasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    );
    expect(hasNoHorizontalOverflow).toBe(true);
  }
});
