import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getSession, toPublicSession } from "../../../lib/auth";

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(env.PROJECT_BALL_DB, request);

  return new Response(
    JSON.stringify(session ? toPublicSession(session) : { authenticated: false }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
};
