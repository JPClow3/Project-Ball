import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    const subscription = await request.json();

    // In a real application, you would save this to PostgreSQL mapped to the user's wallet
    // e.g. await saveSubscription(env.PROJECT_BALL_DB, userWallet, subscription);

    console.log("Received push subscription:", subscription);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to subscribe" }), { status: 500 });
  }
};
