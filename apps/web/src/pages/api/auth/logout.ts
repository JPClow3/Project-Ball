import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { makeClearSessionCookie, revokeSession } from "../../../lib/auth";

export const POST: APIRoute = async ({ request }) => {
  await revokeSession(env.JONAKINHO_DB, request);

  return new Response(JSON.stringify({ authenticated: false }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": makeClearSessionCookie(request)
    }
  });
};
