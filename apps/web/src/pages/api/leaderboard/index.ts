import type { APIRoute } from "astro";
import { getRuntimeEnv } from "@/lib/runtime";
import { getLeaderboard } from "@/lib/leaderboard";

export const GET: APIRoute = async ({ request }) => {
  try {
    const env = getRuntimeEnv();
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    let limit = 50;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 100) {
        limit = parsed;
      }
    }

    const leaderboard = await getLeaderboard(env.PROJECT_BALL_DB, limit);

    return new Response(JSON.stringify(leaderboard), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300" // 5 minutes cache
      }
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch leaderboard" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};