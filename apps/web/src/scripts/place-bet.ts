import {
  CELO_MAINNET,
  CELO_SEPOLIA,
  getFeeCurrencyAddress,
  getTokenAddress,
  projectBallPoolsAbi,
  type Outcome,
  type StablecoinSymbol
} from "@project-ball/shared";
import htmx from "htmx.org";
import { defaultStakeUsd, minimumStakeUsd, outcomeOnchainCodes } from "../data/betting";
import { getAvailableStablecoins, getDefaultStablecoin } from "../lib/tokens";

type EthereumProvider = {
  readonly isMiniPay?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type AuthIntent = "login" | "register";
type Theme = "dark" | "light";
type AuthenticatedSession = Extract<AuthSessionResponse, { readonly authenticated: true }>;
type LoadingTimers = {
  skeleton?: number;
  progress?: number;
};
type ToastTone = "info" | "success" | "error";

type AuthChallengeResponse = {
  readonly message: string;
  readonly nonce: string;
  readonly expiresAt: string;
};

type AuthSessionResponse =
  | {
      readonly authenticated: true;
      readonly user: {
        readonly walletAddress: `0x${string}`;
        readonly displayName: string | null;
      };
    }
  | {
      readonly authenticated: false;
    };

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    provider?: EthereumProvider;
    htmx?: typeof htmx;
    projectBallReady?: boolean;
    projectBallEventsBound?: boolean;
    projectBallLastThemeToggleAt?: number;
  }
}

const chainId = Number(import.meta.env.PUBLIC_CHAIN_ID ?? CELO_SEPOLIA.id);
const targetChainHex = `0x${chainId.toString(16)}` as `0x${string}`;
const emptyContractAddress = "0x0000000000000000000000000000000000000000";
const poolsAddress = (import.meta.env.PUBLIC_PROJECT_BALL_POOLS_ADDRESS ??
  emptyContractAddress) as `0x${string}`;
const themeStorageKey = "project-ball-theme";
const txHashByteLength = 32;
const hexRadix = 16;
const hexByteWidth = 2;
const reusableApprovalUsd = "100";
const skeletonDelayMs = 300;
const progressDelayMs = 2_000;
const successNavigationDelayMs = 300;
const toastDismissMs = 4_000;
const logoutConfirmMs = 4_000;
const authLoadingTimers = new WeakMap<HTMLElement, LoadingTimers>();
const cardLoadingTimers = new WeakMap<HTMLElement, LoadingTimers>();
let logoutConfirmUntil = 0;
let offlineToast: HTMLElement | null = null;
const betPendingControlSelector = [
  "[data-select-outcome]",
  "[data-select-token]",
  "[data-select-stake]",
  "[data-custom-stake]",
  "[data-place-bet]"
].join(",");
const erc20SpendingAbi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

window.htmx ??= htmx;

function getProvider(): EthereumProvider | undefined {
  return window.ethereum ?? window.provider;
}

function providerErrorCode(error: unknown): string | number | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }

  const code = (error as { readonly code?: string | number }).code;
  return typeof code === "number" || typeof code === "string" ? code : undefined;
}

function isUnknownChainError(error: unknown): boolean {
  const code = providerErrorCode(error);
  return code === 4902 || code === "4902";
}

function configuredCeloNetwork() {
  return chainId === CELO_MAINNET.id ? CELO_MAINNET : CELO_SEPOLIA;
}

async function ensureCeloNetwork(provider: EthereumProvider): Promise<void> {
  const currentChainId = (await provider.request({ method: "eth_chainId" }).catch(() => null)) as string | null;

  if (currentChainId?.toLowerCase() === targetChainHex.toLowerCase()) {
    return;
  }

  const network = configuredCeloNetwork();

  if (provider.isMiniPay) {
    throw new Error(`Ative ${network.name} no MiniPay antes de continuar`);
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainHex }]
    });
    return;
  } catch (error) {
    if (!isUnknownChainError(error)) {
      throw new Error(`Mude sua carteira para ${network.name}`);
    }
  }

  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: targetChainHex,
        chainName: network.name,
        nativeCurrency: {
          name: "CELO",
          symbol: "CELO",
          decimals: 18
        },
        rpcUrls: [import.meta.env.PUBLIC_CELO_RPC_URL || network.rpcUrl],
        blockExplorerUrls: [import.meta.env.PUBLIC_CELO_EXPLORER_URL || network.explorerUrl]
      }
    ]
  });

  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: targetChainHex }]
  });
}

function formatWalletAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function authRedirect(value: string | undefined): string {
  if (!value) {
    return "/meus-palpites";
  }

  try {
    const decoded = decodeURIComponent(value).trim();
    if (decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.startsWith("/\\")) {
      if (!/^(?:[a-z\d+\-.]+:|\/\/)/i.test(decoded)) {
        return decoded;
      }
    }
  } catch {}

  return "/meus-palpites";
}

function storedTheme(): Theme | null {
  try {
    const theme = localStorage.getItem(themeStorageKey);
    return theme === "dark" || theme === "light" ? theme : null;
  } catch {
    return null;
  }
}

function preferredTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const themeColor = getComputedStyle(document.documentElement).getPropertyValue("--color-theme-meta").trim();
  if (themeColor) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  }

  for (const button of document.querySelectorAll<HTMLElement>("[data-theme-toggle]")) {
    const label = theme === "light" ? "Usar modo escuro" : "Usar modo claro";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  }
}

function initTheme(): void {
  applyTheme(storedTheme() ?? preferredTheme());
}

function toggleTheme(): void {
  const now = Date.now();
  if (now - (window.projectBallLastThemeToggleAt ?? 0) < 250) {
    return;
  }
  window.projectBallLastThemeToggleAt = now;

  const next: Theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  try {
    localStorage.setItem(themeStorageKey, next);
  } catch {
    // Theme still changes for this page even if storage is unavailable.
  }
  applyTheme(next);
}

function setAuthStatus(source: HTMLElement, message: string, isError = false): void {
  const root = source.closest<HTMLElement>("[data-auth-form]") ?? source.closest<HTMLElement>("main") ?? document;
  const status = root.querySelector<HTMLElement>("[data-auth-status]");

  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle("text-[var(--coral)]", isError);
  status.classList.toggle("text-[var(--muted)]", !isError);
}

function iconSvg(name: string): string {
  const icons: Record<string, string> = {
    "badge-check": "fa-circle-check text-[var(--green)]",
    "loader-circle": "fa-circle-notch ui-icon--spin",
    "log-in": "fa-right-to-bracket",
    "pen-line": "fa-pen-to-square",
    "rotate-ccw": "fa-rotate-left",
    "send": "fa-paper-plane",
    "lock-keyhole": "fa-lock",
    "circle-dot": "fa-circle-dot text-[var(--muted)]"
  };
  const classes = icons[name] ?? "fa-circle-question";

  return `<i class="fa-solid ${classes} ui-icon" aria-hidden="true"></i>`;
}

function setButtonHtml(button: HTMLElement, icon: string, label: string): void {
  button.innerHTML = iconSvg(icon);
  const labelSpan = document.createElement("span");
  labelSpan.textContent = label;
  button.appendChild(labelSpan);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function clearLoadingTimers(map: WeakMap<HTMLElement, LoadingTimers>, element: HTMLElement): void {
  const timers = map.get(element);
  if (timers?.skeleton) {
    window.clearTimeout(timers.skeleton);
  }
  if (timers?.progress) {
    window.clearTimeout(timers.progress);
  }
  map.delete(element);
}

function toastRegion(): HTMLElement {
  let region = document.querySelector<HTMLElement>("[data-toast-region]");
  if (region) {
    return region;
  }

  region = document.createElement("div");
  region.className = "toast-region";
  region.dataset.toastRegion = "true";
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-relevant", "additions removals");
  document.body.append(region);
  return region;
}

function showToast(message: string, tone: ToastTone = "info", persistent = false): HTMLElement {
  const toast = document.createElement("div");
  toast.className = `toast${tone === "error" ? " toast--error" : ""}`;
  toast.dataset.toast = tone;
  toast.setAttribute("role", tone === "error" ? "alert" : "status");
  const text = document.createElement("p");
  text.className = "text-sm font-bold text-[var(--text)]";
  text.textContent = message;
  toast.append(text);
  toastRegion().append(toast);

  if (persistent) {
    return toast;
  }

  let timeout = window.setTimeout(() => toast.remove(), toastDismissMs);
  toast.addEventListener("mouseenter", () => window.clearTimeout(timeout));
  toast.addEventListener("mouseleave", () => {
    timeout = window.setTimeout(() => toast.remove(), toastDismissMs);
  });
  return toast;
}

function updateOfflineState(): void {
  if (!("onLine" in navigator)) {
    return;
  }

  if (!navigator.onLine) {
    if (!offlineToast?.isConnected) {
      offlineToast = showToast("Sem conexão. As ações ficam disponíveis para tentar novamente quando a rede voltar.", "error", true);
    }
    document.documentElement.dataset.offline = "true";
    return;
  }

  document.documentElement.removeAttribute("data-offline");
  if (offlineToast?.isConnected) {
    offlineToast.remove();
    showToast("Conexão restabelecida.", "success");
  }
  offlineToast = null;
}

function setAuthLoading(button: HTMLElement, isLoading: boolean): void {
  const root =
    button.closest<HTMLElement>("[data-auth-action-panel]") ??
    button.closest<HTMLElement>("[data-auth-form]") ??
    button.parentElement;

  if (!root) {
    return;
  }

  clearLoadingTimers(authLoadingTimers, root);
  root.querySelector<HTMLElement>("[data-auth-loading]")?.remove();

  if (!isLoading) {
    return;
  }

  const timers: LoadingTimers = {};
  timers.skeleton = window.setTimeout(() => {
    const skeleton = document.createElement("div");
    skeleton.className = "auth-loading";
    skeleton.dataset.authLoading = "true";
    skeleton.setAttribute("aria-hidden", "true");
    skeleton.innerHTML = [
      '<span class="skeleton-line" style="height: 12px; width: 75%" data-skeleton></span>',
      '<span class="skeleton-line" style="height: 12px; width: 50%" data-skeleton></span>',
      '<span class="loading-progress" aria-hidden="true"></span>'
    ].join("");
    root.append(skeleton);
    timers.progress = window.setTimeout(() => {
      skeleton.dataset.showProgress = "true";
    }, Math.max(0, progressDelayMs - skeletonDelayMs));
  }, skeletonDelayMs);
  authLoadingTimers.set(root, timers);
}

function setBetStatus(card: HTMLElement | null | undefined, message: string, isError = false): void {
  const status = card?.querySelector<HTMLElement>("[data-bet-status]");

  if (!status) {
    return;
  }

  status.hidden = false;
  status.textContent = message;
  status.classList.toggle("bet-status--error", isError);
  status.classList.toggle("bet-status--info", !isError);
}

function clearBetStatus(card: HTMLElement | null | undefined): void {
  const status = card?.querySelector<HTMLElement>("[data-bet-status]");

  if (!status) {
    return;
  }

  status.hidden = true;
  status.textContent = "";
  status.classList.remove("bet-status--error", "bet-status--info");
}

function focusBetStatus(card: HTMLElement | null | undefined): void {
  const status = card?.querySelector<HTMLElement>("[data-bet-status]");

  if (!status || status.hidden) {
    return;
  }

  status.focus({ preventScroll: true });
  status.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
}

function showCardLoading(card: HTMLElement | null | undefined): void {
  if (!card || card.querySelector("[data-loading-card]") || cardLoadingTimers.has(card)) {
    return;
  }

  const timers: LoadingTimers = {};
  timers.skeleton = window.setTimeout(() => {
    const loading = document.createElement("div");
    loading.className = "loading-card htmx-indicator";
    loading.dataset.loadingCard = "true";
    loading.setAttribute("aria-hidden", "true");
    loading.innerHTML = [
      '<span class="skeleton-line" style="height: 16px; width: 66%" data-skeleton></span>',
      '<span class="skeleton-line" style="height: 12px; width: 100%" data-skeleton></span>',
      '<span class="skeleton-line" style="height: 12px; width: 84%" data-skeleton></span>',
      '<span class="loading-progress" aria-hidden="true"></span>'
    ].join("");
    card.append(loading);
    timers.progress = window.setTimeout(() => {
      loading.dataset.showProgress = "true";
    }, Math.max(0, progressDelayMs - skeletonDelayMs));
  }, skeletonDelayMs);
  cardLoadingTimers.set(card, timers);
}

function hideCardLoading(card: HTMLElement | null | undefined): void {
  if (!card) {
    return;
  }

  clearLoadingTimers(cardLoadingTimers, card);
  card.querySelector("[data-loading-card]")?.remove();
}

function setBetControlsLocked(card: HTMLElement | null | undefined, isLocked: boolean): void {
  if (!card) {
    return;
  }

  card.classList.toggle("htmx-request", isLocked);
  card.toggleAttribute("data-bet-pending", isLocked);

  if (isLocked) {
    card.setAttribute("aria-busy", "true");
    showCardLoading(card);
  } else {
    card.removeAttribute("aria-busy");
    hideCardLoading(card);
  }

  for (const control of card.querySelectorAll<HTMLInputElement | HTMLButtonElement>(betPendingControlSelector)) {
    if (isLocked) {
      control.dataset.wasDisabledBeforeBet = control.disabled ? "true" : "false";
      control.disabled = true;
      continue;
    }

    if (control.dataset.wasDisabledBeforeBet !== "true") {
      control.disabled = false;
    }
    delete control.dataset.wasDisabledBeforeBet;
  }
}

function setSegmentState(button: HTMLElement, isActive: boolean): void {
  button.setAttribute("aria-checked", isActive ? "true" : "false");
  button.dataset.state = isActive ? "selected" : "idle";
  button.tabIndex = isActive ? 0 : -1;
}

function selectedStakeValue(card: HTMLElement): string {
  return card.querySelector<HTMLInputElement>("[data-custom-stake]")?.value.trim() ?? String(defaultStakeUsd);
}

function updateStakeError(card: HTMLElement, isInvalid: boolean): void {
  const input = card.querySelector<HTMLInputElement>("[data-custom-stake]");
  const error = card.querySelector<HTMLElement>("[data-stake-error]");

  if (input) {
    input.setAttribute("aria-invalid", isInvalid ? "true" : "false");
  }

  if (error) {
    error.textContent = `Informe pelo menos $${minimumStakeUsd}.`;
    error.hidden = !isInvalid;
  }
}

function syncBetForm(card: HTMLElement): void {
  const outcomeButton = card.querySelector<HTMLElement>('[data-select-outcome][aria-checked="true"]');
  const stakeContainer = card.querySelector<HTMLElement>("[data-stake-container]");
  if (stakeContainer) {
    stakeContainer.style.opacity = outcomeButton ? "1" : "0.55";
    stakeContainer.style.pointerEvents = outcomeButton ? "auto" : "none";
    stakeContainer.style.transition = "opacity 160ms ease";
    stakeContainer.hidden = false;
  }
  const stake = selectedStakeValue(card);
  const submitButton = card.querySelector<HTMLButtonElement>("[data-place-bet]");
  const outcome = outcomeButton?.dataset.outcome as Outcome | undefined;
  const amount = Number(stake);
  const isStakeValid = Number.isFinite(amount) && amount >= minimumStakeUsd;
  const isValid = Boolean(outcome && isStakeValid);

  updateStakeError(card, !isStakeValid);

  if (!submitButton) {
    return;
  }

  submitButton.disabled = !isValid;
  submitButton.dataset.outcome = outcome ?? "";
  submitButton.innerHTML = isValid
    ? "Confirmar palpite"
    : "Escolha um palpite primeiro";
}

function selectOutcome(button: HTMLElement): void {
  const card = button.closest<HTMLElement>("[data-match-card]");

  if (!card) {
    return;
  }

  for (const option of card.querySelectorAll<HTMLElement>("[data-select-outcome]")) {
    setSegmentState(option, option === button);
  }

  clearBetStatus(card);
  syncBetForm(card);
}

function selectToken(button: HTMLElement): void {
  const card = button.closest<HTMLElement>("[data-match-card]");

  if (!card) {
    return;
  }

  for (const option of card.querySelectorAll<HTMLElement>("[data-select-token]")) {
    setSegmentState(option, option === button);
  }

  clearBetStatus(card);
  syncBetForm(card);
}

function selectStake(button: HTMLElement): void {
  const card = button.closest<HTMLElement>("[data-match-card]");
  const stake = button.dataset.stake;
  const input = card?.querySelector<HTMLInputElement>("[data-custom-stake]");

  if (!card || !stake || !input) {
    return;
  }

  input.value = stake;

  for (const option of card.querySelectorAll<HTMLElement>("[data-select-stake]")) {
    setSegmentState(option, option === button);
  }

  clearBetStatus(card);
  syncBetForm(card);
}

function initBetForms(): void {
  for (const card of document.querySelectorAll<HTMLElement>("[data-match-card]")) {
    syncBetForm(card);
  }
}

function applyAuthSession(session: AuthSessionResponse): void {
  const authenticated = session.authenticated;

  for (const element of document.querySelectorAll<HTMLElement>("[data-auth-guest]")) {
    element.hidden = authenticated;
  }

  for (const element of document.querySelectorAll<HTMLElement>("[data-auth-user]")) {
    element.hidden = !authenticated;
  }

  if (!authenticated) {
    const mineFilter = document.querySelector<HTMLElement>('[data-filter-chip][data-filter="mine"][aria-pressed="true"]');
    if (mineFilter) {
      applyMatchFilter("all");
    }
  }

  if (!authenticated) {
    return;
  }

  const label = session.user.displayName ?? formatWalletAddress(session.user.walletAddress);

  for (const element of document.querySelectorAll<HTMLElement>("[data-auth-address]")) {
    element.textContent = label;
  }

  updateBalances(session.user.walletAddress).catch((e) => {
    console.error("Failed to update balances:", e);
  });
}

async function updateBalances(address: `0x${string}`) {
  const provider = getProvider();
  if (!provider) return;
  const [{ createPublicClient, custom, formatUnits }, { celo, celoSepolia }] = await Promise.all([import("viem"), import("viem/chains")]);
  const chain = chainId === celo.id ? celo : celoSepolia;
  const publicClient = createPublicClient({ chain, transport: custom(provider) });
  
  const tokens = getAvailableStablecoins(chainId);
  const erc20Abi = [
    { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] }
  ] as const;

  let highestBalance = 0;
  let highestToken = tokens[0];

  for (const token of tokens) {
    const tokenAddress = getTokenAddress(token.symbol, chainId);
    if (!tokenAddress) continue;
    try {
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address]
      });
      const formatted = Number(formatUnits(balance, token.decimals));
      if (formatted >= highestBalance) {
        highestBalance = formatted;
        highestToken = token;
      }
    } catch (e) {
      console.error(e);
    }
  }

  const balanceDisplay = document.querySelector<HTMLElement>("[data-balance-display]");
  const balanceContainer = document.querySelector<HTMLElement>("[data-balance-container]");
  const addFunds = document.querySelector<HTMLElement>("[data-add-funds]");

  if (balanceDisplay) {
    balanceDisplay.textContent = `$${highestBalance.toFixed(2)} ${highestToken.symbol}`;
    try {
      localStorage.setItem("preferred-stablecoin", highestToken.symbol);
    } catch {}
    
    for (const badge of document.querySelectorAll<HTMLElement>("[data-preferred-token-badge]")) {
      badge.textContent = highestToken.symbol;
      badge.dataset.tokenSymbol = highestToken.symbol;
    }
  }

  if (highestBalance === 0) {
    if (balanceContainer) balanceContainer.hidden = true;
    if (addFunds) addFunds.hidden = false;
  } else {
    if (balanceContainer) balanceContainer.hidden = false;
    if (addFunds) addFunds.hidden = true;
  }
}

async function refreshAuthSession(): Promise<AuthSessionResponse> {
  const response = await fetch("/api/auth/session", {
    headers: {
      accept: "application/json"
    }
  });
  const session = (await response.json()) as AuthSessionResponse;
  applyAuthSession(session);
  return session;
}

async function requireAuthSession(): Promise<AuthenticatedSession> {
  const session = await refreshAuthSession();

  if (!session.authenticated) {
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/login?next=${encodeURIComponent(next)}`);
    throw new Error("Entre com sua carteira antes de confirmar na Celo");
  }

  return session;
}

async function requestAuthChallenge(address: `0x${string}`, intent: AuthIntent): Promise<AuthChallengeResponse> {
  const response = await fetch("/api/auth/nonce", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({ address, intent })
  });

  if (!response.ok) {
    throw new Error("Não foi possível iniciar a autenticação");
  }

  return response.json() as Promise<AuthChallengeResponse>;
}

async function postWalletAuth(options: {
  intent: AuthIntent;
  address: `0x${string}`;
  nonce: string;
  signature: `0x${string}`;
  displayName?: string;
}): Promise<AuthSessionResponse> {
  const response = await fetch(`/api/auth/${options.intent}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify(options)
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string; code?: string };

  if (!response.ok) {
    if (payload.code === "not_registered") {
      throw new Error("Carteira ainda não cadastrada");
    }

    throw new Error(payload.error ?? "Não foi possível autenticar");
  }

  return payload as AuthSessionResponse;
}

function getDisplayName(button: HTMLElement): string | undefined {
  const form = button.closest<HTMLElement>("[data-auth-form]");
  const input = form?.querySelector<HTMLInputElement>("[data-auth-display-name]");
  const value = input?.value.trim();
  return value ? value : undefined;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof (error as Record<string, unknown>).message === "string") {
    return (error as Record<string, unknown>).message as string;
  }

  return fallback;
}

function betErrorMessage(error: unknown): string {
  const code = providerErrorCode(error);
  const message = errorMessage(error, "Não foi possível confirmar o palpite");
  const normalized = message.toLowerCase();

  if (code === 4001 || code === "4001" || /rejeitad|recusad|denied|rejected|user rejected/.test(normalized)) {
    return "Transação rejeitada na carteira. Seu palpite não foi enviado.";
  }

  if (/insufficient|saldo|funds|balance/.test(normalized)) {
    return "Saldo insuficiente para confirmar o palpite e pagar a taxa da rede.";
  }

  if (/network|rede|fetch|failed to fetch|timeout|tempo/.test(normalized)) {
    return "Falha de rede. Verifique a conexão e tente novamente.";
  }

  if (/allowance|approve|aprova/.test(normalized)) {
    return "A aprovação do dólar digital não foi concluída. Tente confirmar novamente.";
  }

  if (/contrato celo não configurado|project_ball_pools_address|project ball pools address|not configured/.test(normalized)) {
    return "Contrato Celo não configurado para este ambiente.";
  }

  return message;
}

async function postMiniPayAuth(address: `0x${string}`, displayName?: string): Promise<AuthSessionResponse> {
  const response = await fetch("/api/auth/minipay", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({ address, displayName })
  });
  const payload = (await response.json().catch(() => ({}))) as AuthSessionResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Não foi possível iniciar a sessão MiniPay");
  }

  return payload;
}

async function ensureMiniPaySession(address: `0x${string}`): Promise<AuthenticatedSession> {
  const current = await refreshAuthSession().catch(() => ({ authenticated: false }) as AuthSessionResponse);

  if (current.authenticated && current.user.walletAddress.toLowerCase() === address.toLowerCase()) {
    return current;
  }

  const session = await postMiniPayAuth(address);
  applyAuthSession(session);

  if (!session.authenticated) {
    throw new Error("Não foi possível iniciar a sessão MiniPay");
  }

  return session;
}

async function authenticateWithWallet(button: HTMLElement): Promise<void> {
  const intent = button.dataset.authIntent as AuthIntent | undefined;
  const provider = getProvider();

  if (intent !== "login" && intent !== "register") {
    return;
  }

  if (!navigator.onLine) {
    const message = "Sem conexão. Reconecte a rede e tente entrar novamente.";
    setAuthStatus(button, message, true);
    showToast(message, "error");
    return;
  }

  if (!provider) {
    setAuthStatus(button, "Carteira não encontrada. Abra no MiniPay ou instale MetaMask.", true);
    showToast("Carteira não encontrada. Abra no MiniPay ou instale MetaMask.", "error");
    return;
  }

  if (provider.isMiniPay) {
    const originalHtml = button.dataset.originalHtml ?? button.innerHTML;
    button.dataset.originalHtml = originalHtml;
    button.setAttribute("disabled", "true");
    setAuthLoading(button, true);
    setButtonHtml(button, "loader-circle", "Abrindo MiniPay");
    setAuthStatus(button, "Conecte a carteira MiniPay para entrar sem assinatura.");

    try {
      await ensureCeloNetwork(provider);
      const address = await requestAccount(provider);
      const session = await postMiniPayAuth(address, getDisplayName(button));

      applyAuthSession(session);
      setAuthStatus(button, "MiniPay conectado. Abrindo destino.");
      setButtonHtml(button, "badge-check", "Conectado");
      window.location.assign(authRedirect(button.dataset.authRedirect));
    } catch (error) {
      const code = providerErrorCode(error);
      let message = errorMessage(error, "Não foi possível conectar o MiniPay");
      const normalized = message.toLowerCase();

      if (code === 4001 || code === "4001" || /rejeitad|recusad|denied|rejected|user rejected/.test(normalized)) {
        message = "Autenticação cancelada na carteira.";
      }

      setAuthStatus(button, message, true);
      showToast(message, "error");
      button.innerHTML = originalHtml;
    } finally {
      setAuthLoading(button, false);
      button.removeAttribute("disabled");
    }
    return;
  }

  const originalHtml = button.dataset.originalHtml ?? button.innerHTML;
  button.dataset.originalHtml = originalHtml;
  button.setAttribute("disabled", "true");
  setAuthLoading(button, true);
  setButtonHtml(button, "loader-circle", "Conectar carteira");
  setAuthStatus(button, "Etapa 1 de 4: confirmando rede Celo.");

  try {
    await ensureCeloNetwork(provider);
    setAuthStatus(button, "Etapa 2 de 4: aprove a conexão da carteira.");

    const address = await requestAccount(provider);
    const challenge = await requestAuthChallenge(address, intent);

    setButtonHtml(button, "pen-line", "Assinar mensagem");
    setAuthStatus(button, "Etapa 3 de 4: assine a mensagem sem taxa.");

    const signature = (await provider.request({
      method: "personal_sign",
      params: [challenge.message, address]
    })) as `0x${string}`;

    setButtonHtml(button, "loader-circle", "Validando sessão");
    setAuthStatus(button, "Etapa 4 de 4: validando assinatura.");

    const session = await postWalletAuth({
      intent,
      address,
      nonce: challenge.nonce,
      signature,
      displayName: getDisplayName(button)
    });

    applyAuthSession(session);
    setAuthStatus(button, "Carteira conectada. Abrindo destino.");
    setButtonHtml(button, "badge-check", "Conectado");

    await delay(successNavigationDelayMs);
    window.location.assign(authRedirect(button.dataset.authRedirect));
  } catch (error) {
    const code = providerErrorCode(error);
    let message = errorMessage(error, "Autenticação cancelada");
    const normalized = message.toLowerCase();

    if (code === 4001 || code === "4001" || /rejeitad|recusad|denied|rejected|user rejected/.test(normalized)) {
      message = "Autenticação cancelada na carteira.";
    }

    if (message === "Carteira ainda não cadastrada") {
      window.location.assign(`/register?next=${encodeURIComponent(authRedirect(button.dataset.authRedirect))}`);
      return;
    }

    setAuthStatus(button, message, true);
    showToast(message, "error");
    button.innerHTML = originalHtml;
  } finally {
    setAuthLoading(button, false);
    button.removeAttribute("disabled");
  }
}

async function logout(button?: HTMLElement): Promise<void> {
  const now = Date.now();
  if (now > logoutConfirmUntil) {
    logoutConfirmUntil = now + logoutConfirmMs;
    button?.setAttribute("aria-label", "Confirmar saída");
    button?.setAttribute("title", "Confirmar saída");
    showToast("Toque em sair novamente para encerrar a sessão.", "error");
    window.setTimeout(() => {
      if (Date.now() >= logoutConfirmUntil) {
        logoutConfirmUntil = 0;
        button?.setAttribute("aria-label", "Sair");
        button?.setAttribute("title", "Sair");
      }
    }, logoutConfirmMs);
    return;
  }

  button?.setAttribute("disabled", "true");
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: {
      accept: "application/json"
    }
  });
  applyAuthSession({ authenticated: false });
  window.location.assign("/");
}

function selectedStablecoin(symbol?: string) {
  const explicit = getAvailableStablecoins(chainId).find((token) => token.symbol === symbol);
  if (explicit) {
    return explicit;
  }

  return getDefaultStablecoin(chainId);
}

async function requestAccount(provider: EthereumProvider): Promise<`0x${string}`> {
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as `0x${string}`[];
  const [account] = accounts;

  if (!account) {
    throw new Error("Carteira não conectada");
  }

  return account;
}

function createLocalTxHash(): `0x${string}` {
  const bytes = new Uint8Array(txHashByteLength);
  window.crypto.getRandomValues(bytes);
  const hex = [...bytes].map((byte) => byte.toString(hexRadix).padStart(hexByteWidth, "0")).join("");

  return `0x${hex}`;
}

async function submitLocalConfirmation(matchId: string, outcome: Outcome): Promise<string> {
  const txHash = createLocalTxHash();
  const response = await fetch("/api/confirm-bet", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ txHash, matchId, outcome })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.text();
}

function normalizeOutcome(outcome: Outcome): number {
  return outcomeOnchainCodes[outcome];
}

function resolveOnchainMatchId(
  matchId: string,
  stringToHex: (value: string, options: { size: number }) => `0x${string}`,
  explicit?: string
): `0x${string}` {
  if (explicit?.startsWith("0x")) {
    return explicit as `0x${string}`;
  }

  return stringToHex(matchId, { size: 32 });
}

async function placeBet(options: {
  matchId: string;
  onchainMatchId?: string;
  outcome: Outcome;
  tokenSymbol?: StablecoinSymbol;
  stakeUsd: string;
  onTxSent?: () => void;
}): Promise<string> {
  const provider = getProvider();
  const { matchId, onchainMatchId, outcome, tokenSymbol, stakeUsd, onTxSent } = options;

  if (provider?.isMiniPay && poolsAddress === emptyContractAddress) {
    await ensureCeloNetwork(provider);
    const account = await requestAccount(provider);
    await ensureMiniPaySession(account);
  }

  if (!provider || poolsAddress === emptyContractAddress) {
    if (onTxSent) onTxSent();
    return submitLocalConfirmation(matchId, outcome);
  }

  let session: AuthenticatedSession | null = provider.isMiniPay ? null : await requireAuthSession();
  await ensureCeloNetwork(provider);
  const account = await requestAccount(provider);

  if (provider.isMiniPay) {
    session = await ensureMiniPaySession(account);
  }

  if (session && session.user.walletAddress.toLowerCase() !== account.toLowerCase()) {
    throw new Error("Use a mesma carteira do login para confirmar o palpite");
  }

  const token = selectedStablecoin(tokenSymbol);
  const tokenAddress = getTokenAddress(token.symbol, chainId);
  const feeCurrency = getFeeCurrencyAddress(token.symbol, chainId);

  if (!tokenAddress) {
    throw new Error("Dólar digital indisponível nesta rede");
  }

  const [{ createPublicClient, createWalletClient, custom, encodeFunctionData, parseUnits, stringToHex }, { celo, celoSepolia }] =
    await Promise.all([import("viem"), import("viem/chains")]);
  const chain = chainId === celo.id ? celo : celoSepolia;
  const publicClient = createPublicClient({
    chain,
    transport: custom(provider)
  });
  const wallet = createWalletClient({
    account,
    chain,
    transport: custom(provider)
  });

  const amount = parseUnits(stakeUsd, token.decimals);
  const reusableApprovalAmount = parseUnits(reusableApprovalUsd, token.decimals);
  const currentAllowance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20SpendingAbi,
    functionName: "allowance",
    args: [account, poolsAddress]
  });
  const data = encodeFunctionData({
    abi: projectBallPoolsAbi,
    functionName: "placeBet",
    args: [resolveOnchainMatchId(matchId, stringToHex, onchainMatchId), normalizeOutcome(outcome), tokenAddress, amount]
  });
  let approvedAllowance = false;

  if (currentAllowance < amount) {
    const approveData = encodeFunctionData({
      abi: erc20SpendingAbi,
      functionName: "approve",
      args: [poolsAddress, amount > reusableApprovalAmount ? amount : reusableApprovalAmount]
    });

    await wallet.sendTransaction({
      account,
      to: tokenAddress,
      data: approveData,
      feeCurrency: feeCurrency ?? undefined
    });
    approvedAllowance = true;
  }

  try {
    const txHash = await wallet.sendTransaction({
      account,
      to: poolsAddress,
      data,
      feeCurrency: feeCurrency ?? undefined
    });

    if (onTxSent) onTxSent();

    const response = await fetch("/api/confirm-bet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txHash, matchId, outcome })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.text();
  } catch (error) {
    if (approvedAllowance) {
      try {
        const resetApproveData = encodeFunctionData({
          abi: erc20SpendingAbi,
          functionName: "approve",
          args: [poolsAddress, 0n]
        });
        await wallet.sendTransaction({
          account,
          to: tokenAddress,
          data: resetApproveData,
          feeCurrency: feeCurrency ?? undefined
        });
      } catch (resetError) {
        console.error("Failed to reset allowance:", resetError);
      }
    }
    throw error;
  }
}

function currentMatchFilter(): string {
  return document.querySelector<HTMLElement>("[data-filter-chip][aria-pressed='true']")?.dataset.filter ?? "all";
}

function findReplacementCard(cardId: string, matchId: string | undefined): HTMLElement | null {
  return (
    document.getElementById(cardId) ??
    (matchId ? document.querySelector<HTMLElement>(`[data-match-card][data-match-id="${CSS.escape(matchId)}"]`) : null)
  );
}

function replaceMatchCard(button: HTMLElement, html: string): void {
  const card = button.closest("[data-match-card]");

  if (!card) {
    return;
  }

  const cardId = card.id;
  const matchId = card instanceof HTMLElement ? card.dataset.matchId : undefined;
  const activeFilter = currentMatchFilter();
  const runtime = window.htmx ?? htmx;

  const isCompact = card.classList.contains("match-card-compact");
  const isFeatured = card.classList.contains("match-card-featured");

  try {
    runtime.swap(card, html, { swapStyle: "outerHTML", swapDelay: 0, settleDelay: 0 });
  } catch {
    card.insertAdjacentHTML("afterend", html);
    card.remove();
  }

  const replacement = findReplacementCard(cardId, matchId);

  if (!replacement) {
    return;
  }

  if (isCompact) {
    replacement.classList.add("match-card-compact");
  }
  if (isFeatured) {
    replacement.classList.add("match-card-featured");
  }

  runtime.process(replacement);
  syncBetForm(replacement);
  applyMatchFilter(activeFilter);

  const focusTarget =
    replacement.querySelector<HTMLElement>("[data-confirmed-panel]") ??
    replacement.querySelector<HTMLElement>("[data-bet-status]");
  focusTarget?.focus({ preventScroll: true });
  replacement.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });

  // Micro-animation: Celebrate with confetti if the card indicates a confirmed bet
  if (replacement.dataset.confirmed === "true" && typeof (window as any).confetti === "function") {
    (window as any).confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

function updateNavigationState(): void {
  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";

  for (const link of document.querySelectorAll<HTMLAnchorElement>("[data-nav-link]")) {
    const linkPath = new URL(link.href, window.location.href).pathname.replace(/\/$/, "") || "/";
    if (linkPath === currentPath) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function activateGroup(groupId: string, focusTab = false): void {
  const tabs = [...document.querySelectorAll<HTMLElement>("[data-group-tab]")];
  const panels = [...document.querySelectorAll<HTMLElement>("[data-group-panel]")];

  if (!tabs.length || !groupId) {
    return;
  }

  for (const tab of tabs) {
    const isActive = tab.dataset.groupId === groupId;
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
    tab.tabIndex = isActive ? 0 : -1;

    if (isActive && focusTab) {
      tab.focus();
      tab.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }

  for (const panel of panels) {
    panel.hidden = panel.dataset.groupId !== groupId;
  }
}

function initGroupTabs(): void {
  const tabs = [...document.querySelectorAll<HTMLElement>("[data-group-tab]")];
  const selected = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? tabs[0];
  const groupId = selected?.dataset.groupId;

  if (groupId) {
    activateGroup(groupId);
  }
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function cardMatchesFilter(card: HTMLElement, filter: string): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "mine") {
    return card.dataset.confirmed === "true";
  }

  if (filter === "brazil") {
    return card.dataset.homeFlagCode === "br" || card.dataset.awayFlagCode === "br";
  }

  const kickoff = card.dataset.matchKickoffIso ? new Date(card.dataset.matchKickoffIso) : null;

  if (!kickoff) {
    return false;
  }

  if (filter === "today") {
    return isSameLocalDay(kickoff, new Date());
  }

  if (filter === "soon") {
    const diffMs = kickoff.getTime() - Date.now();
    return diffMs > 0 && diffMs <= 72 * 60 * 60 * 1000;
  }

  return true;
}

function updateFilterEmptyStates(): void {
  for (const panel of document.querySelectorAll<HTMLElement>("[data-group-panel]")) {
    const visibleCards = [...panel.querySelectorAll<HTMLElement>("[data-match-card]")].filter((card) => !card.hidden);
    const empty = panel.querySelector<HTMLElement>("[data-filter-empty]");

    if (empty) {
      empty.hidden = visibleCards.length > 0;
    }
  }
}

function applyMatchFilter(filter: string): void {
  const chips = [...document.querySelectorAll<HTMLElement>("[data-filter-chip]")];
  const panels = [...document.querySelectorAll<HTMLElement>("[data-group-panel]")];

  for (const chip of chips) {
    chip.setAttribute("aria-pressed", chip.dataset.filter === filter ? "true" : "false");
  }

  for (const card of document.querySelectorAll<HTMLElement>("[data-match-card]")) {
    card.hidden = !cardMatchesFilter(card, filter);
  }

  const firstPanelWithMatch = panels.find((panel) =>
    [...panel.querySelectorAll<HTMLElement>("[data-match-card]")].some((card) => !card.hidden)
  );
  const currentPanel = panels.find((panel) => !panel.hidden);
  const currentHasVisibleMatch = currentPanel
    ? [...currentPanel.querySelectorAll<HTMLElement>("[data-match-card]")].some((card) => !card.hidden)
    : false;

  if (!currentHasVisibleMatch && firstPanelWithMatch?.dataset.groupId) {
    activateGroup(firstPanelWithMatch.dataset.groupId);
  }

  updateFilterEmptyStates();
}

function initMatchFilters(): void {
  const activeFilter = document.querySelector<HTMLElement>('[data-filter-chip][aria-pressed="true"]')?.dataset.filter ?? "all";
  applyMatchFilter(activeFilter);
}

function handleGroupKeydown(event: KeyboardEvent): void {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const tab = target.closest<HTMLElement>("[data-group-tab]");

  if (!tab) {
    return;
  }

  const tabs = [...document.querySelectorAll<HTMLElement>("[data-group-tab]")];
  const currentIndex = tabs.indexOf(tab);

  if (currentIndex < 0) {
    return;
  }

  let nextIndex = currentIndex;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = (currentIndex + 1) % tabs.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = tabs.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  const nextGroupId = tabs[nextIndex]?.dataset.groupId;

  if (nextGroupId) {
    activateGroup(nextGroupId, true);
  }
}

function handleSegmentKeydown(event: KeyboardEvent): void {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const current = target.closest<HTMLElement>("[data-select-outcome], [data-select-token], [data-select-stake]");

  if (!current) {
    return;
  }

  const group = current.closest<HTMLElement>('[role="radiogroup"]');
  const options = group
    ? [...group.querySelectorAll<HTMLElement>("[data-select-outcome], [data-select-token], [data-select-stake]")].filter(
        (option) => !option.hasAttribute("disabled")
      )
    : [];
  const currentIndex = options.indexOf(current);

  if (currentIndex < 0) {
    return;
  }

  let nextIndex = currentIndex;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = (currentIndex + 1) % options.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = (currentIndex - 1 + options.length) % options.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = options.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  const next = options[nextIndex];
  next.focus();

  if (next.hasAttribute("data-select-outcome")) {
    selectOutcome(next);
  } else if (next.hasAttribute("data-select-token")) {
    selectToken(next);
  } else {
    selectStake(next);
  }
}

async function handleDocumentClick(event: MouseEvent): Promise<void> {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const authButton = target.closest<HTMLElement>("[data-auth-intent]");

  if (authButton) {
    await authenticateWithWallet(authButton);
    return;
  }

  const themeButton = target.closest<HTMLElement>("[data-theme-toggle]");

  if (themeButton) {
    toggleTheme();
    return;
  }

  const logoutButton = target.closest<HTMLElement>("[data-auth-logout]");

  if (logoutButton) {
    await logout(logoutButton);
    return;
  }

  const groupTab = target.closest<HTMLElement>("[data-group-tab]");

  if (groupTab?.dataset.groupId) {
    activateGroup(groupTab.dataset.groupId);
    updateFilterEmptyStates();
    return;
  }

  const filterChip = target.closest<HTMLElement>("[data-filter-chip]");

  if (filterChip?.dataset.filter) {
    applyMatchFilter(filterChip.dataset.filter);
    return;
  }

  const filterReset = target.closest<HTMLElement>("[data-filter-reset]");

  if (filterReset) {
    applyMatchFilter("all");
    return;
  }

  const outcomeButton = target.closest<HTMLElement>("[data-select-outcome]");

  if (outcomeButton) {
    selectOutcome(outcomeButton);
    return;
  }

  const tokenButton = target.closest<HTMLElement>("[data-select-token]");

  if (tokenButton) {
    selectToken(tokenButton);
    return;
  }

  const stakeButton = target.closest<HTMLElement>("[data-select-stake]");

  if (stakeButton) {
    selectStake(stakeButton);
    return;
  }

  const connectButton = target.closest<HTMLElement>("[data-connect-wallet]");

  if (connectButton) {
    const provider = getProvider();
    if (provider) {
      const originalHtml = connectButton.innerHTML;
      try {
        setButtonHtml(connectButton, "loader-circle", "Conectando");
        connectButton.setAttribute("disabled", "true");
        await ensureCeloNetwork(provider);
        const address = await requestAccount(provider);
        if (provider.isMiniPay) {
          await ensureMiniPaySession(address);
        }
        setButtonHtml(connectButton, "badge-check", "Conectado");
        showToast("Carteira conectada com sucesso.", "success");
      } catch (error) {
        console.error("Wallet connection failed:", error);
        const message = error instanceof Error ? error.message : "Falha ao conectar carteira.";
        showToast(message, "error");
        connectButton.innerHTML = originalHtml;
      } finally {
        connectButton.removeAttribute("disabled");
      }
    } else {
      showToast("Carteira não encontrada. Abra no MiniPay ou instale MetaMask.", "error");
    }
    return;
  }

  const betButton = target.closest<HTMLElement>("[data-place-bet]");

  if (!betButton) {
    return;
  }

  const card = betButton.closest<HTMLElement>("[data-match-card]");

  if (card?.hasAttribute("data-bet-pending")) {
    return;
  }

  const matchId = betButton.dataset.matchId ?? card?.dataset.matchId;
  const outcome = betButton.dataset.outcome as Outcome | undefined;
  const stakeUsd = card ? selectedStakeValue(card) : String(defaultStakeUsd);
  const tokenSymbol = card?.querySelector<HTMLElement>('[data-select-token][aria-checked="true"]')?.dataset
    .tokenSymbol as StablecoinSymbol | undefined;

  if (!navigator.onLine) {
    const message = "Sem conexão. Verifique a rede e tente confirmar novamente.";
    setBetStatus(card, message, true);
    showToast(message, "error");
    focusBetStatus(card);
    return;
  }

  if (
    !matchId ||
    (outcome !== "HOME" && outcome !== "DRAW" && outcome !== "AWAY") ||
    !Number.isFinite(Number(stakeUsd)) ||
    Number(stakeUsd) < minimumStakeUsd
  ) {
    if (card) {
      syncBetForm(card);
      setBetStatus(card, "Escolha um palpite e informe um valor válido para continuar.", true);
      focusBetStatus(card);
    }
    return;
  }

  clearBetStatus(card);
  setBetControlsLocked(card, true);
  betButton.innerHTML = `${iconSvg("loader-circle")}Enviando...`;

  try {
    const html = await placeBet({
      matchId,
      onchainMatchId: betButton.dataset.matchOnchainId ?? card?.dataset.matchOnchainId,
      outcome,
      tokenSymbol,
      stakeUsd,
      onTxSent: () => {
        if (betButton.isConnected && card) {
          // Optimistic UI Update
          card.classList.add("optimistic-registered");
          const form = card.querySelector("[data-bet-form]");
          const stakeContainer = card.querySelector("[data-stake-container]");
          if (stakeContainer) stakeContainer.setAttribute("hidden", "true");
          betButton.setAttribute("hidden", "true");
          
          const optimisticPanel = document.createElement("div");
          optimisticPanel.className = "success-panel";
          optimisticPanel.setAttribute("data-optimistic-panel", "true");
          optimisticPanel.innerHTML = `
            <p class="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
              <svg class="ui-icon animate-spin" style="color: var(--green); width: 16px; height: 16px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Confirmando na rede...
            </p>
          `;
          form?.appendChild(optimisticPanel);
        }
      }
    });
    replaceMatchCard(betButton, html);
    showToast("Palpite confirmado com sucesso.", "success");
  } catch (error) {
    if (card) {
      card.classList.remove("optimistic-registered");
      const optimisticPanel = card.querySelector("[data-optimistic-panel]");
      if (optimisticPanel) optimisticPanel.remove();
      const stakeContainer = card.querySelector("[data-stake-container]");
      if (stakeContainer) stakeContainer.removeAttribute("hidden");
      betButton.removeAttribute("hidden");
    }
    const message = betErrorMessage(error);
    setBetControlsLocked(card, false);
    betButton.innerHTML = `${iconSvg("rotate-ccw")}Tentar de novo`;
    setBetStatus(card, message, true);
    showToast(message, "error");
    focusBetStatus(card);
  }
}

function handleDocumentInput(event: Event): void {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const stakeInput = target.closest<HTMLInputElement>("[data-custom-stake]");

  if (!stakeInput) {
    return;
  }

  const card = stakeInput.closest<HTMLElement>("[data-match-card]");

  if (!card) {
    return;
  }

  for (const button of card.querySelectorAll<HTMLElement>("[data-select-stake]")) {
    setSegmentState(button, button.dataset.stake === stakeInput.value);
  }

  clearBetStatus(card);
  syncBetForm(card);
}

function bindGlobalListeners(): void {
  if (window.projectBallEventsBound) {
    return;
  }

  document.addEventListener("click", (event) => {
    handleDocumentClick(event).catch((error) => {
      console.error("Unhandled error in click handler:", error);
    });
  });
  document.addEventListener("keydown", handleGroupKeydown);
  document.addEventListener("keydown", handleSegmentKeydown);
  document.addEventListener("input", handleDocumentInput);
  document.addEventListener("astro:page-load", initPage);
  window.addEventListener("online", updateOfflineState);
  window.addEventListener("offline", updateOfflineState);
  window.projectBallEventsBound = true;
}

function initPage(): void {
  (window.htmx ?? htmx).process(document.body);
  initTheme();
  updateNavigationState();
  initGroupTabs();
  initBetForms();
  initMatchFilters();
  updateOfflineState();
  void refreshAuthSession().catch(() => undefined);
  window.projectBallReady = true;
}

bindGlobalListeners();

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}
