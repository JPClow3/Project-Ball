import type { APIRoute } from "astro";
import { getRuntimeEnv } from "@/lib/runtime";
import { refreshLeaderboardCache } from "@/lib/leaderboard";
import { isProductionMode } from "@/lib/config";

export const POST: APIRoute = async ({ request }) => {
  try {
    const env = getRuntimeEnv();
    const authHeader = request.headers.get("Authorization");

    const adminSecret = process.env.ADMIN_SECRET ?? env.ADMIN_SECRET;
    if (isProductionMode() && !adminSecret) {
      return new Response(JSON.stringify({ error: "ADMIN_SECRET is required" }), { status: 500 });
    }

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    await refreshLeaderboardCache(env.PROJECT_BALL_DB);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error refreshing leaderboard:", error);
    return new Response(JSON.stringify({ error: "Failed to refresh leaderboard" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
