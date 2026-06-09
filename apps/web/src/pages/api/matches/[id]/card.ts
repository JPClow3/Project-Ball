import { getMatch } from "@/lib/matches";
import { renderMatchCard } from "@/lib/render";
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ params }) => {
  const match = getMatch(params.id ?? "");

  if (!match) {
    return new Response("Jogo não encontrado", { status: 404 });
  }

  return new Response(renderMatchCard(match), {
    headers: {
      "content-type": "text/html; charset=utf-8"
    }
  });
};
