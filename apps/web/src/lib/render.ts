import { type Match, type Outcome } from "@project-ball/shared";
import { getDefaultStablecoin } from "./tokens";
import {
  defaultStakeUsd,
  emptyOutcomeTotalsUsd,
  getOutcomePoolShares,
  minimumStakeUsd,
  outcomeLabels,
  stakeOptionsUsd,
  stakeStepUsd,
  type OutcomeTotalsUsd
} from "../data/betting";
import { formatUsd, formatKickoff } from "./format";
import { isLastChance } from "./matches";

type FlaggedMatch = Match & {
  readonly competition?: string;
  readonly groupLabel?: string;
  readonly venue?: string;
  readonly homeFlagCode?: string;
  readonly awayFlagCode?: string;
  readonly homeCountry?: string;
  readonly awayCountry?: string;
  readonly outcomeTotalsUsd?: OutcomeTotalsUsd;
  readonly supporterCount?: number;
};

const outcomes = ["HOME", "DRAW", "AWAY"] as const satisfies readonly Outcome[];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function flagImage(code: string | undefined, country: string, alignAway = false): string {
  if (!code) {
    return "";
  }

  return `<img class="flag-img${alignAway ? " ml-auto" : ""}" src="https://flagcdn.com/w80/${escapeHtml(code)}.png" alt="Bandeira: ${escapeHtml(country)}" loading="lazy">`;
}

function smallFlag(code: string | undefined): string {
  return code ? `<img src="https://flagcdn.com/w40/${escapeHtml(code)}.png" alt="" loading="lazy" aria-hidden="true">` : "";
}

function outcomeDisplayLabel(match: FlaggedMatch, outcome: Outcome): string {
  if (outcome === "HOME") {
    return match.homeTeam;
  }

  if (outcome === "AWAY") {
    return match.awayTeam;
  }

  return "Empate";
}

function outcomeHelper(outcome: Outcome): string {
  return outcome === "DRAW" ? "sem vencedor" : "vence";
}

function outcomeAriaLabel(match: FlaggedMatch, outcome: Outcome): string {
  const label = outcomeDisplayLabel(match, outcome);
  return outcome === "DRAW" ? label : `${label} vence`;
}

function renderOutcomeButtons(match: Match, selected?: Outcome, disabled = false): string {
  const flaggedMatch = match as FlaggedMatch;

  return outcomes
    .map((outcome) => {
      const label = outcomeDisplayLabel(flaggedMatch, outcome);
      const isSelected = selected === outcome;
      const disabledAttr = disabled ? "disabled" : "";
      const flagCode = outcome === "HOME" ? flaggedMatch.homeFlagCode : outcome === "AWAY" ? flaggedMatch.awayFlagCode : undefined;
      const visual = flagCode ? smallFlag(flagCode) : '<span class="draw-mark" aria-hidden="true">=</span>';
      const drawClass = outcome === "DRAW" ? " team-pick-draw" : "";

      return `<button class="team-pick focus-ring${drawClass}" type="button" role="radio" aria-label="${escapeHtml(outcomeAriaLabel(flaggedMatch, outcome))}" aria-checked="${isSelected ? "true" : "false"}" data-state="${isSelected ? "selected" : "idle"}" data-select-outcome data-match-id="${escapeHtml(match.id)}" data-outcome="${outcome}" data-outcome-label="${escapeHtml(label)}" ${disabledAttr}>${visual}<span class="team-pick-name">${escapeHtml(label)}</span><span class="team-pick-helper">${escapeHtml(outcomeHelper(outcome))}</span></button>`;
    })
    .join("");
}

function renderStakeButtons(): string {
  return stakeOptionsUsd
    .map((stake) => {
      const isSelected = stake === defaultStakeUsd;

      return `<button class="segment-control focus-ring" type="button" role="radio" aria-checked="${isSelected ? "true" : "false"}" data-state="${isSelected ? "selected" : "idle"}" data-select-stake data-stake="${stake}">$${stake}</button>`;
    })
    .join("");
}

export function renderMatchCard(match: Match): string {
  const flaggedMatch = match as FlaggedMatch;
  const selected = match.userPick;
  const isConfirmed = Boolean(selected);
  const cardState = selected ? "Confirmado" : isLastChance(match.kickoffIso) ? "Última chance" : "Aberto";
  const statusIcon = selected 
    ? `<i class="fa-solid fa-circle-check ui-icon" style="font-size: 14px;" aria-hidden="true"></i>`
    : `<i class="fa-solid fa-circle-dot ui-icon" style="font-size: 14px;" aria-hidden="true"></i>`;
  const selectedLabel = selected ? outcomeDisplayLabel(flaggedMatch, selected) : outcomeLabels.HOME;
  const selectedResultText = selected
    ? selected === "DRAW"
      ? "Empate"
      : `${selectedLabel} vence`
    : "";
  const poolShares = getOutcomePoolShares(flaggedMatch.outcomeTotalsUsd ?? emptyOutcomeTotalsUsd);
  const labelledPoolShares = poolShares.map((item) => ({
    ...item,
    label: outcomeDisplayLabel(flaggedMatch, item.outcome)
  }));
  const totalShare = labelledPoolShares.reduce((total, item) => total + item.share, 0);
  const displayedPoolShares = labelledPoolShares.map((item, index) => ({
    ...item,
    barShare: totalShare > 0 ? item.share : index === poolShares.length - 1 ? 34 : 33
  }));
  const homeCountry = flaggedMatch.homeCountry ?? match.homeTeam;
  const awayCountry = flaggedMatch.awayCountry ?? match.awayTeam;
  const groupLabel = flaggedMatch.groupLabel ?? "Grupo";
  const competition = flaggedMatch.competition ?? "Copa do Mundo 2026";
  const venue = flaggedMatch.venue ?? "Estádio a confirmar";
  const supporterCount = flaggedMatch.supporterCount ?? 0;
  const onchainId = match.onchainId ?? "";
  const defaultToken = getDefaultStablecoin();

  return `
    <article id="match-card-${escapeHtml(match.id)}" class="match-card" data-match-card data-filter-card data-match-id="${escapeHtml(match.id)}" data-match-onchain-id="${escapeHtml(onchainId)}" data-match-kickoff-iso="${escapeHtml(match.kickoffIso)}" data-home-team="${escapeHtml(match.homeTeam)}" data-away-team="${escapeHtml(match.awayTeam)}" data-home-flag-code="${escapeHtml(flaggedMatch.homeFlagCode ?? "")}" data-away-flag-code="${escapeHtml(flaggedMatch.awayFlagCode ?? "")}" data-confirmed="${isConfirmed ? "true" : "false"}">
      <div class="match-card-body">
        <div class="match-topline">
          <div class="min-w-0">
            <p class="match-label">${escapeHtml(groupLabel)}</p>
            <h2 class="sr-only">${escapeHtml(match.homeTeam)} x ${escapeHtml(match.awayTeam)}</h2>
            <p class="mt-1 truncate text-xs font-extrabold uppercase text-[var(--muted)]">${escapeHtml(defaultToken.label)} padrão - ${escapeHtml(competition)}</p>
          </div>
          <span class="status-pill ${selected ? "status-pill--locked" : "status-pill--open"}">${statusIcon}${escapeHtml(cardState)}</span>
        </div>

        <div class="teams-line" aria-label="${escapeHtml(match.homeTeam)} x ${escapeHtml(match.awayTeam)}">
          <div class="team-block">
            ${flagImage(flaggedMatch.homeFlagCode, homeCountry)}
            <p class="team-name">${escapeHtml(match.homeTeam)}</p>
          </div>
          <span class="versus-pill" aria-hidden="true">x</span>
          <div class="team-block team-block--away">
            ${flagImage(flaggedMatch.awayFlagCode, awayCountry, true)}
            <p class="team-name">${escapeHtml(match.awayTeam)}</p>
          </div>
        </div>

        <p class="match-meta-row">
          <span><i class="fa-solid fa-clock text-[var(--cyan)] ui-icon" style="font-size: 16px;" aria-hidden="true"></i>${escapeHtml(formatKickoff(match.kickoffIso))}</span>
          <span class="min-w-0"><i class="fa-solid fa-map-pin text-[var(--gold)] ui-icon" style="font-size: 16px;" aria-hidden="true"></i><span class="truncate ml-1">${escapeHtml(venue)}</span></span>
        </p>

        <div class="match-finance-row" aria-label="Resumo do pote">
          <div class="finance-stat">
            <p class="finance-label"><i class="fa-solid fa-coins text-[var(--gold)] ui-icon" style="font-size: 14px;" aria-hidden="true"></i>Pote agora</p>
            <p class="finance-value text-[var(--green)]">${escapeHtml(formatUsd(match.poolUsd))}</p>
          </div>
          <div class="finance-stat">
            <p class="finance-label justify-end"><i class="fa-solid fa-circle-dollar-to-slot text-[var(--cyan)] ui-icon" style="font-size: 14px;" aria-hidden="true"></i>Valor padrão</p>
            <p class="finance-value">${escapeHtml(formatUsd(defaultStakeUsd))}</p>
          </div>
        </div>

        <div class="pool-stack">
          <div class="pool-label-row"><span>${supporterCount.toLocaleString("pt-BR")} palpites</span><span>Divisão do pote</span></div>
          <div class="pool-track" aria-hidden="true">${displayedPoolShares.map((item) => `<span class="pool-fill ${item.color}" style="width: ${item.barShare}%"></span>`).join("")}</div>
          <div class="pool-legend">${labelledPoolShares.map((item) => `<p class="pool-legend-item"><strong>${item.share}%</strong> ${escapeHtml(item.label)}</p>`).join("")}</div>
        </div>

        <form class="grid gap-3" data-bet-form>
          <input type="hidden" name="matchId" value="${escapeHtml(match.id)}">
          <div class="grid gap-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-black text-[var(--text)]">Seu palpite</p>
              ${selected ? '<p class="text-xs font-black uppercase text-[var(--green)]">Registrado</p>' : ""}
            </div>
            <div class="team-pick-grid" role="radiogroup" aria-label="Escolha do palpite">${renderOutcomeButtons(match, selected, isConfirmed)}</div>
          </div>

          ${
            selected
              ? `<div class="rounded-[8px] border border-[rgba(97,229,149,0.28)] bg-[rgba(97,229,149,0.09)] p-3"><p class="flex items-center gap-1.5 text-sm font-black text-[var(--text)]"><i class="fa-solid fa-circle-check text-[var(--green)] ui-icon" style="font-size: 16px;" aria-hidden="true"></i>Palpite registrado</p><p class="mt-1 text-sm font-semibold text-[var(--muted)]">${escapeHtml(selectedResultText)}. Depois do resultado, mostramos saque, reembolso ou liquidação.</p></div>`
              : `<div class="grid gap-2"><p class="text-sm font-black text-[var(--text)]">Valor</p><div class="grid grid-cols-[1fr_auto] gap-3"><div class="segment-grid" role="radiogroup" aria-label="Valor do palpite">${renderStakeButtons()}</div><input class="form-control focus-ring w-20 text-center text-sm" type="number" min="${minimumStakeUsd}" step="${stakeStepUsd}" value="${defaultStakeUsd}" inputmode="decimal" aria-label="Valor personalizado" data-custom-stake></div></div><button class="btn-primary focus-ring w-full" type="button" disabled data-place-bet data-match-id="${escapeHtml(match.id)}" data-match-onchain-id="${escapeHtml(onchainId)}" data-outcome=""><i class="fa-solid fa-lock ui-icon" style="font-size: 16px;" aria-hidden="true"></i>Confirmar palpite</button>`
          }
        </form>
      </div>
    </article>
  `.trim();
}
