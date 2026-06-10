import type { APIRoute } from "astro";
import { getRuntimeEnv } from "../../../lib/runtime";
import { makeClearSessionCookie, revokeSession } from "../../../lib/auth";

export const POST: APIRoute = async ({ request }) => {
  try {
    const env = getRuntimeEnv();
    await revokeSession(env.PROJECT_BALL_DB, request);
  } catch (error) {
    console.error("Error during logout session revocation:", error);
  }

  return new Response(JSON.stringify({ authenticated: false }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": makeClearSessionCookie(request)
    }
  });
};
