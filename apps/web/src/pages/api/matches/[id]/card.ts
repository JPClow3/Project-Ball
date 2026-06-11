import { getMatch } from "@/lib/matches";
import { renderMatchCard } from "@/lib/render";
import type { APIRoute } from "astro";

import { getCache, setCache } from "@/lib/cache";

export const GET: APIRoute = async ({ params }) => {
  try {
    const matchId = params.id ?? "";
    const cacheKey = `matchcard:html:${matchId}`;

    const cachedHtml = await getCache<string>(cacheKey);
    if (cachedHtml) {
      return new Response(cachedHtml, {
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }

    const match = getMatch(matchId);

    if (!match) {
      return new Response("Jogo não encontrado", { status: 404 });
    }

    const html = renderMatchCard(match);
    await setCache(cacheKey, html, 60); // Cache for 60 seconds

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    });
  } catch (error) {
    console.error("Error in match card API:", error);
    return new Response("Erro ao renderizar card da partida", { status: 500 });
  }
};
