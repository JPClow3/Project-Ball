import { defineMiddleware } from "astro:middleware";
import { appConfig } from "./lib/config";

function configuredRpcOrigin(): string | null {
  try {
    return new URL(appConfig.celoRpcUrl).origin;
  } catch {
    return null;
  }
}

function contentSecurityPolicy(isHttps: boolean): string {
  const connectSources = new Set([
    "'self'",
    "https://forno.celo.org",
    "https://forno.celo-sepolia.celo-testnet.org"
  ]);
  const rpcOrigin = configuredRpcOrigin();

  if (rpcOrigin) {
    connectSources.add(rpcOrigin);
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: https://flagcdn.com",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "script-src 'self' 'unsafe-inline'",
    `connect-src ${[...connectSources].join(" ")}`,
    "form-action 'self'"
  ];

  if (isHttps) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

const securityHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff"
} as const;

import { getLanguageFromAccept } from "./i18n";

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.lang = getLanguageFromAccept(context.request.headers.get("Accept-Language"));

  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    const origin = context.request.headers.get("Origin");
    if (origin && origin !== context.url.origin) {
      return new Response("Forbidden (CSRF)", { status: 403 });
    }
  }

  const response = await next();
  const headers = new Headers(response.headers);
  const isHttps = context.url.protocol === "https:";

  headers.set("Content-Security-Policy", contentSecurityPolicy(isHttps));
  for (const [name, value] of Object.entries(securityHeaders)) {
    headers.set(name, value);
  }

  if (isHttps) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
});
