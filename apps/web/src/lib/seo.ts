import { appConfig } from "./config";

export type SitemapEntry = {
  path: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
};

export const publicSitemapEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: 1 },
  { path: "/stats", changefreq: "daily", priority: 0.8 },
  { path: "/about", changefreq: "monthly", priority: 0.6 },
  { path: "/support", changefreq: "monthly", priority: 0.6 },
  { path: "/terms", changefreq: "yearly", priority: 0.3 },
  { path: "/privacy", changefreq: "yearly", priority: 0.3 }
];

export const robotsDisallowPaths = [
  "/api/",
  "/login",
  "/register",
  "/meus-palpites",
  "/premios"
] as const;

export function siteOrigin(): string {
  return appConfig.appUrl.replace(/\/$/, "");
}
