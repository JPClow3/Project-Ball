import type { APIRoute } from "astro";
import { getRuntimeEnv } from "@/lib/runtime";
import { refreshLeaderboardCache } from "@/lib/leaderboard";

export const POST: APIRoute = async ({ request }) => {
  try {
    const env = getRuntimeEnv();
    const authHeader = request.headers.get("Authorization");
    
    // Simple admin token check (in a real app, use a strong secret from env)
    // For now, we check if they have the ADMIN_SECRET if configured, 
    const adminSecret = (env as any).ADMIN_SECRET || import.meta.env.ADMIN_SECRET;
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
