import { expect, test } from "@playwright/test";

test("mobile home renders match cards and local confirmation flow", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "72 jogos. Palpites sem rodeio." })).toBeVisible();
  await page.waitForFunction(() => Boolean((window as Window & { projectBallReady?: boolean }).projectBallReady));

  const firstCard = page.locator('[data-match-card][data-match-id="wc26-400021443"]');
  await expect(firstCard).toContainText("México x África do Sul");
  await expect(firstCard).toContainText("USDC padrão");
  await expect(firstCard.locator("[data-select-token]")).toHaveCount(0);
  await expect(firstCard.getByAltText("Bandeira: México")).toBeVisible();
  await expect(firstCard.getByAltText("Bandeira: África do Sul")).toBeVisible();
  await expect(firstCard.getByRole("button", { name: "Confirmar palpite" })).toBeDisabled();
  await firstCard.getByRole("radio", { name: "México vence" }).click();
  await expect(firstCard).not.toContainText("Palpite registrado");
  await expect(firstCard.getByRole("button", { name: "Confirmar palpite" })).toBeEnabled();
  const confirmationResponse = page.waitForResponse(
    (response) => response.url().includes("/api/confirm-bet") && response.status() === 200,
    { timeout: 60_000 }
  );
  await firstCard.getByRole("button", { name: "Confirmar palpite" }).click();
  await confirmationResponse;
  await expect(firstCard).toContainText("Palpite registrado", { timeout: 60_000 });
  await expect(firstCard).toContainText("México vence");

  const hasNoHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );
  expect(hasNoHorizontalOverflow).toBe(true);
});
