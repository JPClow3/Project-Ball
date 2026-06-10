import type { APIRoute } from "astro";
import { robotsDisallowPaths, siteOrigin } from "@/lib/seo";

export const GET: APIRoute = () => {
  const lines = [
    "User-agent: *",
    "Allow: /",
    ...robotsDisallowPaths.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${siteOrigin()}/sitemap.xml`
  ];

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
};
