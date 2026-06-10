import type { APIRoute } from "astro";
import { getRuntimeEnv } from "../../../lib/runtime";
import {
  createAuthChallenge,
  normalizeWalletAddress,
  parseAuthIntent
} from "../../../lib/auth";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const env = getRuntimeEnv();
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const walletAddress = normalizeWalletAddress(payload?.address);
    const intent = parseAuthIntent(payload?.intent);

    if (!walletAddress || !intent) {
      return json({ error: "Carteira ou ação inválida" }, 400);
    }

    const challenge = await createAuthChallenge(env.PROJECT_BALL_DB, walletAddress, intent, new URL(request.url).origin);

    return json({
      nonce: challenge.nonce,
      message: challenge.message,
      expiresAt: challenge.expiresAt
    });
  } catch (error) {
    console.error("Error in nonce API:", error);
    return json({ error: "Erro interno no servidor ao gerar mensagem de autenticação" }, 500);
  }
};
