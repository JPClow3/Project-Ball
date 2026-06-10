import type { APIRoute } from "astro";
import { getRuntimeEnv } from "../../../lib/runtime";
import { getSession, toPublicSession } from "../../../lib/auth";

export const GET: APIRoute = async ({ request }) => {
  const env = getRuntimeEnv();
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
