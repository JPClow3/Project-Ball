import type { APIRoute } from "astro";

export const POST: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      error: "Push notifications require explicit opt-in and production VAPID configuration.",
      code: "push_not_configured"
    }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" }
    }
  );
};
