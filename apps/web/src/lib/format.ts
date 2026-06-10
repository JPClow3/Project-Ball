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
  if (outcome === "HOME") return "outcome-tone-home";
  if (outcome === "DRAW") return "outcome-tone-draw";
  return "outcome-tone-away";
}
