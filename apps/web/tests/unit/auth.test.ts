import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import {
  createAuthChallenge,
  createMiniPaySession,
  loginWithWallet,
  normalizeNonce,
  normalizeSignature,
  readSessionId,
  registerWithWallet
} from "../../src/lib/auth";

describe("auth parsing", () => {
  it("rejects malformed wallet signatures before verification", () => {
    expect(normalizeSignature("0x1234")).toBeNull();
    expect(normalizeSignature(`0x${"a".repeat(127)}`)).toBeNull();
    expect(normalizeSignature(`0x${"a".repeat(130)}`)).toBe(`0x${"a".repeat(130)}`);
  });

  it("accepts only generated nonce identifiers", () => {
    expect(normalizeNonce("nonce_abc")).toBeNull();
    expect(normalizeNonce(`nonce_${"g".repeat(32)}`)).toBeNull();
    expect(normalizeNonce(`nonce_${"a".repeat(32)}`)).toBe(`nonce_${"a".repeat(32)}`);
  });

  it("treats malformed session cookies as anonymous", () => {
    const malformed = new Request("https://projectball.example/meus-palpites", {
      headers: {
        cookie: "project_ball_session=%E0%A4%A"
      }
    });
    const valid = new Request("https://projectball.example/meus-palpites", {
      headers: {
        cookie: "theme=dark; project_ball_session=session_abc%20123"
      }
    });

    expect(readSessionId(malformed)).toBeNull();
    expect(readSessionId(valid)).toBe("session_abc 123");
  });

  it("creates a no-sign MiniPay session for a valid wallet address", async () => {
    const account = privateKeyToAccount(`0x${"3".repeat(64)}`);
    const session = await createMiniPaySession({
      db: undefined,
      walletAddress: account.address,
      displayName: "MiniPay"
    });

    expect(session.user.walletAddress).toBe(account.address);
    expect(session.user.displayName).toBe("MiniPay");
    expect(session.id).toMatch(/^session_/);
  });

  it("rejects nonce replay, wrong intent, and wrong-wallet challenge use", async () => {
    const origin = "https://projectball.example";
    const alice = privateKeyToAccount(`0x${"1".repeat(64)}`);
    const bob = privateKeyToAccount(`0x${"2".repeat(64)}`);
    const registerChallenge = await createAuthChallenge(undefined, alice.address, "register", origin);
    const registerSignature = await alice.signMessage({ message: registerChallenge.message });

    await expect(
      loginWithWallet({
        db: undefined,
        walletAddress: alice.address,
        nonce: registerChallenge.nonce,
        signature: registerSignature
      })
    ).resolves.toBeNull();

    await expect(
      registerWithWallet({
        db: undefined,
        walletAddress: bob.address,
        nonce: registerChallenge.nonce,
        signature: registerSignature,
        displayName: null
      })
    ).resolves.toBeNull();

    const session = await registerWithWallet({
      db: undefined,
      walletAddress: alice.address,
      nonce: registerChallenge.nonce,
      signature: registerSignature,
      displayName: "Alice"
    });

    expect(session?.user.walletAddress).toBe(alice.address);

    await expect(
      registerWithWallet({
        db: undefined,
        walletAddress: alice.address,
        nonce: registerChallenge.nonce,
        signature: registerSignature,
        displayName: "Replay"
      })
    ).resolves.toBeNull();

    const loginChallenge = await createAuthChallenge(undefined, alice.address, "login", origin);
    const loginSignature = await alice.signMessage({ message: loginChallenge.message });
    const loginSession = await loginWithWallet({
      db: undefined,
      walletAddress: alice.address,
      nonce: loginChallenge.nonce,
      signature: loginSignature
    });

    expect(loginSession).not.toBeNull();
    expect(loginSession).not.toBe("not_registered");

    await expect(
      loginWithWallet({
        db: undefined,
        walletAddress: alice.address,
        nonce: loginChallenge.nonce,
        signature: loginSignature
      })
    ).resolves.toBeNull();
  });
});
