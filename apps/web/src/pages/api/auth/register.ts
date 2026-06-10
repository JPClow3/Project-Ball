import type { APIRoute } from "astro";
import { getRuntimeEnv } from "../../../lib/runtime";
import {
  makeSessionCookie,
  normalizeDisplayName,
  normalizeNonce,
  normalizeSignature,
  normalizeWalletAddress,
  registerWithWallet,
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
  try {
    const env = getRuntimeEnv();
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const walletAddress = normalizeWalletAddress(payload?.address);
    const nonce = normalizeNonce(payload?.nonce);
    const signature = normalizeSignature(payload?.signature);

    if (!walletAddress || !nonce || !signature) {
      return json({ error: "Assinatura inválida" }, { status: 400 });
    }

    const session = await registerWithWallet({
      db: env.PROJECT_BALL_DB,
      walletAddress,
      nonce,
      signature,
      displayName: normalizeDisplayName(payload?.displayName)
    });

    if (!session) {
      return json({ error: "Não foi possível validar a assinatura" }, { status: 401 });
    }

    return json(toPublicSession(session), {
      headers: {
        "Set-Cookie": makeSessionCookie(session, request)
      }
    });
  } catch (error) {
    console.error("Error in register API:", error);
    return json({ error: "Erro interno no servidor ao cadastrar carteira" }, { status: 500 });
  }
};
