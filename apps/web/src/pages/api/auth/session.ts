import type { APIRoute } from "astro";
import { getRuntimeEnv } from "../../../lib/runtime";
import { getSession, toPublicSession } from "../../../lib/auth";

export const GET: APIRoute = async ({ request }) => {
  try {
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
  } catch (error) {
    console.error("Database error during session API retrieval:", error);
    return new Response(
      JSON.stringify({ error: "Serviço temporariamente indisponível" }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        }
      }
    );
  }
};
