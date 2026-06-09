import type { Outcome } from "@project-ball/shared";
import { tournamentConfig } from "../data/tournament";

export function formatUsd(value: string | number): string {
  const numericValue = typeof value === "number" ? value : Number.parseFloat(value);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(numericValue);
}

export function formatKickoff(isoDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tournamentConfig.displayTimeZone,
    timeZoneName: "short"
  }).format(new Date(isoDate));
}

export function formatKickoffFull(isoDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tournamentConfig.displayTimeZone,
    timeZoneName: "short"
  }).format(new Date(isoDate));
}

export function getOutcomeTone(outcome: Outcome): string {
  if (outcome === "HOME") return "from-[rgba(41,220,129,0.24)] to-[rgba(41,220,129,0.06)]";
  if (outcome === "DRAW") return "from-[rgba(255,209,102,0.24)] to-[rgba(255,209,102,0.06)]";
  return "from-[rgba(103,216,255,0.22)] to-[rgba(103,216,255,0.06)]";
}
