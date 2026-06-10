import { type Match, type MatchStatus, type Outcome } from "@project-ball/shared";
import {
  defaultStakeUsd,
  emptyOutcomeTotalsUsd,
  getOutcomePoolShares,
  minimumStakeUsd,
  stakeOptionsUsd,
  stakeStepUsd,
  type OutcomeTotalsUsd
} from "../data/betting";
import { formatKickoff, formatUsd } from "./format";
import { getDefaultStablecoin } from "./tokens";

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
    .replaceAll("'", "&apos;");
}

function flagImage(code: string | undefined, country: string, alignAway = false): string {
  if (!code) {
    return "";
  }

  return `<img class="flag-img${alignAway ? " ml-auto" : ""}" src="https://flagcdn.com/w80/${escapeHtml(code)}.png" alt="Bandeira: ${escapeHtml(country)}" width="80" height="60" loading="lazy" decoding="async">`;
}

function smallFlag(code: string | undefined): string {
  return code
    ? `<img src="https://flagcdn.com/w40/${escapeHtml(code)}.png" alt="" width="40" height="30" loading="lazy" decoding="async" aria-hidden="true">`
    : "";
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

function statusLabel(status: MatchStatus, isConfirmed: boolean): string {
  if (isConfirmed) {
    return "Confirmado";
  }

  if (status === "open") {
    return "Aberto";
  }

  if (status === "locked") {
    return "Travado";
  }

  return status;
}

function statusIcon(status: MatchStatus, isConfirmed: boolean): string {
  const iconClass = isConfirmed
    ? "fa-solid fa-circle-check"
    : status === "open"
      ? "fa-solid fa-circle-dot"
      : "fa-solid fa-lock";

  return `<i class="${iconClass} ui-icon" style="font-size: 16px;" aria-hidden="true"></i>`;
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

function renderActionArea(match: Match, selected?: Outcome): string {
  const flaggedMatch = match as FlaggedMatch;
  const isConfirmed = Boolean(selected);

  if (match.status === "open" && !isConfirmed) {
    const stakeInputId = `custom-stake-${match.id}`;
    const stakeErrorId = `${stakeInputId}-error`;

    return `<div class="grid gap-2"><p class="text-sm font-semibold text-[var(--text)]">Valor</p><div class="grid gap-2" data-stake-field><div class="grid grid-cols-[1fr_auto] gap-4"><div class="segment-grid" role="radiogroup" aria-label="Valor do palpite">${renderStakeButtons()}</div><input id="${escapeHtml(stakeInputId)}" class="form-control focus-ring w-20 text-center text-sm" type="number" min="${minimumStakeUsd}" step="${stakeStepUsd}" value="${defaultStakeUsd}" inputmode="decimal" aria-label="Valor personalizado" aria-describedby="${escapeHtml(stakeErrorId)}" aria-invalid="false" data-custom-stake></div><p id="${escapeHtml(stakeErrorId)}" class="field-error" data-stake-error hidden>Informe pelo menos $${minimumStakeUsd}.</p></div></div><button class="btn-primary focus-ring w-full" type="button" disabled data-place-bet data-match-id="${escapeHtml(match.id)}" data-match-onchain-id="${escapeHtml(match.onchainId ?? "")}" data-outcome=""><i class="fa-solid fa-circle-dot text-[var(--muted)] ui-icon" style="font-size: 16px;" aria-hidden="true"></i>Confirmar palpite</button>`;
  }

  if (selected) {
    const selectedLabel = outcomeDisplayLabel(flaggedMatch, selected);
    const selectedResultText = selected === "DRAW" ? "Empate" : `${selectedLabel} vence`;

    return `<div class="success-panel" data-confirmed-panel tabindex="-1"><p class="flex items-center gap-2 text-sm font-bold text-[var(--text)]"><i class="fa-solid fa-circle-check text-[var(--green)] ui-icon" style="font-size: 16px;" aria-hidden="true"></i>Palpite registrado</p><p class="text-sm font-medium text-[var(--muted)]">${escapeHtml(selectedResultText)}. A partida libera saque, reembolso ou liquidação quando o resultado for confirmado.</p></div>`;
  }

  return `<div class="locked-panel"><p class="flex items-center gap-2 text-sm font-bold text-[var(--text)]"><i class="fa-solid fa-lock text-[var(--gold)] ui-icon" style="font-size: 16px;" aria-hidden="true"></i>Palpites encerrados</p><p class="text-sm font-medium text-[var(--muted)]">Esta partida não aceita novos palpites neste momento.</p></div>`;
}

export function renderMatchCard(match: Match): string {
  const flaggedMatch = match as FlaggedMatch;
  const selected = match.userPick;
  const isConfirmed = Boolean(selected);
  const isLocked = match.status !== "open";
  const controlsDisabled = isLocked || isConfirmed;
  const statusClass = match.status === "open" && !isConfirmed ? "status-pill--open" : "status-pill--locked";
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
  const statusId = `bet-status-${match.id}`;

  return `
    <article id="match-card-${escapeHtml(match.id)}" class="match-card" data-match-card data-filter-card data-match-id="${escapeHtml(match.id)}" data-match-onchain-id="${escapeHtml(onchainId)}" data-match-kickoff-iso="${escapeHtml(match.kickoffIso)}" data-home-team="${escapeHtml(match.homeTeam)}" data-away-team="${escapeHtml(match.awayTeam)}" data-home-flag-code="${escapeHtml(flaggedMatch.homeFlagCode ?? "")}" data-away-flag-code="${escapeHtml(flaggedMatch.awayFlagCode ?? "")}" data-match-status="${match.status}" data-confirmed="${isConfirmed ? "true" : "false"}" aria-describedby="${escapeHtml(statusId)}">
      <div class="match-card-body">
        <div class="match-topline">
          <div class="min-w-0">
            <p class="match-label">${escapeHtml(groupLabel)}</p>
            <h2 class="sr-only">${escapeHtml(match.homeTeam)} x ${escapeHtml(match.awayTeam)}</h2>
            <p class="mt-2 truncate text-xs font-semibold uppercase text-[var(--muted)]">${escapeHtml(defaultToken.label)} padrão - ${escapeHtml(competition)}</p>
          </div>
          <span class="status-pill ${statusClass}">${statusIcon(match.status, isConfirmed)}${escapeHtml(statusLabel(match.status, isConfirmed))}</span>
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
          <span class="min-w-0"><i class="fa-solid fa-map-pin text-[var(--gold)] ui-icon" style="font-size: 16px;" aria-hidden="true"></i><span class="truncate ml-2">${escapeHtml(venue)}</span></span>
        </p>

        <div class="match-finance-row" aria-label="Resumo do pote">
          <div class="finance-stat">
            <p class="finance-label"><i class="fa-solid fa-coins text-[var(--gold)] ui-icon" style="font-size: 16px;" aria-hidden="true"></i>Pote agora</p>
            <p class="finance-value text-[var(--green)]">${escapeHtml(formatUsd(match.poolUsd))}</p>
          </div>
          <div class="finance-stat">
            <p class="finance-label justify-end"><i class="fa-solid fa-circle-dollar-to-slot text-[var(--cyan)] ui-icon" style="font-size: 16px;" aria-hidden="true"></i>Valor padrão</p>
            <p class="finance-value">${escapeHtml(formatUsd(defaultStakeUsd))}</p>
          </div>
        </div>

        <div class="pool-stack">
          <div class="pool-label-row"><span>${supporterCount.toLocaleString("pt-BR")} palpites</span><span>Divisão do pote</span></div>
          <div class="pool-track" aria-hidden="true">${displayedPoolShares.map((item) => `<span class="pool-fill ${item.color}" style="width: ${item.barShare}%"></span>`).join("")}</div>
          <div class="pool-legend">${labelledPoolShares.map((item) => `<p class="pool-legend-item"><strong>${item.share}%</strong> ${escapeHtml(item.label)}</p>`).join("")}</div>
        </div>

        <form class="grid gap-4" data-bet-form>
          <input type="hidden" name="matchId" value="${escapeHtml(match.id)}">
          <div class="grid gap-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-[var(--text)]">Seu palpite</p>
              ${selected ? '<p class="text-xs font-semibold uppercase text-[var(--green)]">Registrado</p>' : ""}
            </div>
            <div class="team-pick-grid" role="radiogroup" aria-label="Escolha do palpite">${renderOutcomeButtons(match, selected, controlsDisabled)}</div>
          </div>
          <p id="${escapeHtml(statusId)}" class="bet-status" data-bet-status role="status" aria-live="polite" tabindex="-1" hidden></p>
          ${renderActionArea(match, selected)}
        </form>
      </div>
    </article>
  `.trim();
}
