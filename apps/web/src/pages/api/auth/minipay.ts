import type { APIRoute } from "astro";
import { getRuntimeEnv } from "../../../lib/runtime";
import {
  createMiniPaySession,
  makeSessionCookie,
  normalizeDisplayName,
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
  try {
    const env = getRuntimeEnv();
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const walletAddress = normalizeWalletAddress(payload?.address);

    if (!walletAddress) {
      return json({ error: "Carteira inválida" }, { status: 400 });
    }

    const session = await createMiniPaySession({
      db: env.PROJECT_BALL_DB,
      walletAddress,
      displayName: normalizeDisplayName(payload?.displayName)
    });

    return json(toPublicSession(session), {
      headers: {
        "Set-Cookie": makeSessionCookie(session, request)
      }
    });
  } catch (error) {
    console.error("Error in minipay API:", error);
    return json({ error: "Erro interno no servidor ao autenticar MiniPay" }, { status: 500 });
  }
};
