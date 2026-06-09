import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  loginWithWallet,
  makeSessionCookie,
  normalizeNonce,
  normalizeSignature,
  normalizeWalletAddress,
  toPublicSession
} from "../../../lib/auth";

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers
    }
  });
}

export const POST: APIRoute = async ({ request }) => {
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const walletAddress = normalizeWalletAddress(payload?.address);
  const nonce = normalizeNonce(payload?.nonce);
  const signature = normalizeSignature(payload?.signature);

  if (!walletAddress || !nonce || !signature) {
    return json({ error: "Assinatura inválida" }, { status: 400 });
  }

  const session = await loginWithWallet({
    db: env.JONAKINHO_DB,
    walletAddress,
    nonce,
    signature
  });

  if (session === "not_registered") {
    return json({ error: "Carteira ainda não cadastrada", code: "not_registered" }, { status: 404 });
  }

  if (!session) {
    return json({ error: "Não foi possível validar a assinatura" }, { status: 401 });
  }

  return json(toPublicSession(session), {
    headers: {
      "Set-Cookie": makeSessionCookie(session, request)
    }
  });
};
