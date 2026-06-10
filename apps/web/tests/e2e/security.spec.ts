import { expect, test } from "@playwright/test";

const validTxHash = `0x${"a".repeat(64)}`;
const validSignature = `0x${"b".repeat(130)}`;
const validAddress = "0x1111111111111111111111111111111111111111";
const validNonce = `nonce_${"c".repeat(32)}`;

test.describe("security and penetration probes", () => {
  test("sets browser-facing security headers", async ({ request }) => {
    const response = await request.get("/");
    expect(response.ok()).toBe(true);

    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).toContain("connect-src");
    expect(headers["content-security-policy"]).toContain("https://forno.celo-sepolia.celo-testnet.org");
  });

  test("rejects malformed API payloads without leaking stack traces", async ({ request }) => {
    const malformedBet = await request.post("/api/confirm-bet", {
      data: {
        txHash: "0x1234",
        matchId: "wc26-400021443",
        outcome: "HOME"
      }
    });
    expect(malformedBet.status()).toBe(400);
    await expectNoStackTrace(malformedBet);

    const xssMatch = await request.post("/api/confirm-bet", {
      data: {
        txHash: validTxHash,
        matchId: '<script>alert("x")</script>',
        outcome: "HOME"
      }
    });
    expect(xssMatch.status()).toBe(404);
    const xssText = await xssMatch.text();
    expect(xssText).not.toContain("<script");
    expect(xssText).not.toContain("alert");

    const unknownCard = await request.get("/api/matches/%2e%2e/card");
    expect(unknownCard.status()).toBeGreaterThanOrEqual(400);
    await expectNoStackTrace(unknownCard);
  });

  test("hardens wallet auth endpoints against invalid nonce and signature probes", async ({ request }) => {
    const invalidNonce = await request.post("/api/auth/nonce", {
      data: {
        address: "not-a-wallet",
        intent: "register"
      }
    });
    expect(invalidNonce.status()).toBe(400);
    expect(invalidNonce.headers()["set-cookie"]).toBeUndefined();

    const missingNonce = await request.post("/api/auth/login", {
      data: {
        address: validAddress,
        signature: validSignature
      }
    });
    expect(missingNonce.status()).toBe(400);
    expect(missingNonce.headers()["set-cookie"]).toBeUndefined();

    const bogusChallenge = await request.post("/api/auth/login", {
      data: {
        address: validAddress,
        nonce: validNonce,
        signature: validSignature
      }
    });
    expect(bogusChallenge.status()).toBe(401);
    expect(bogusChallenge.headers()["set-cookie"]).toBeUndefined();
    await expectNoStackTrace(bogusChallenge);

    const invalidMiniPay = await request.post("/api/auth/minipay", {
      data: {
        address: "not-a-wallet"
      }
    });
    expect(invalidMiniPay.status()).toBe(400);
    expect(invalidMiniPay.headers()["set-cookie"]).toBeUndefined();

    const validMiniPay = await request.post("/api/auth/minipay", {
      data: {
        address: validAddress
      }
    });
    expect(validMiniPay.status()).toBe(200);
    expect(validMiniPay.headers()["set-cookie"]).toContain("project_ball_session=");
  });

  test("allows local-only fake confirmation only for valid known match payloads", async ({ request }) => {
    const unknownMatch = await request.post("/api/confirm-bet", {
      data: {
        txHash: validTxHash,
        matchId: "wc26-does-not-exist",
        outcome: "HOME"
      }
    });
    expect(unknownMatch.status()).toBe(404);

    const knownMatch = await request.post("/api/confirm-bet", {
      data: {
        txHash: validTxHash,
        matchId: "wc26-400021443",
        outcome: "DRAW"
      }
    });
    expect(knownMatch.status()).toBe(200);
    expect(knownMatch.headers()["content-type"]).toContain("text/html");
    const knownMatchBody = await knownMatch.text();
    expect(knownMatchBody).toContain("Palpite registrado");
    expect(knownMatchBody).toContain("Empate");
  });
});

async function expectNoStackTrace(response: { text(): Promise<string> }) {
  const body = await response.text();
  expect(body).not.toContain("Stack trace");
  expect(body).not.toContain("at ");
  expect(body).not.toContain("Error:");
}
