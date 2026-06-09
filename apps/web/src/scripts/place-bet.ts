import {
  CELO_MAINNET,
  CELO_SEPOLIA,
  getFeeCurrencyAddress,
  getTokenAddress,
  jonakinhoPoolsAbi,
  type Outcome,
  type StablecoinSymbol
} from "@jonakinho/shared";
import { defaultStakeUsd, minimumStakeUsd, outcomeOnchainCodes } from "../data/betting";
import { getAvailableStablecoins, getDefaultStablecoin } from "../lib/tokens";

type EthereumProvider = {
  readonly isMiniPay?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type AuthIntent = "login" | "register";
type Theme = "dark" | "light";
type AuthenticatedSession = Extract<AuthSessionResponse, { readonly authenticated: true }>;

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
    htmx?: {
      swap(target: Element, content: string, options: { swapStyle: string }): void;
    };
    jonakinhoReady?: boolean;
    jonakinhoEventsBound?: boolean;
    jonakinhoLastThemeToggleAt?: number;
  }
}

const chainId = Number(import.meta.env.PUBLIC_CHAIN_ID ?? CELO_SEPOLIA.id);
const targetChainHex = `0x${chainId.toString(16)}` as `0x${string}`;
const emptyContractAddress = "0x0000000000000000000000000000000000000000";
const poolsAddress = (import.meta.env.PUBLIC_JONAKINHO_POOLS_ADDRESS ??
  emptyContractAddress) as `0x${string}`;
const themeStorageKey = "jonakinho-theme";
const txHashByteLength = 32;
const hexRadix = 16;
const hexByteWidth = 2;
const erc20ApproveAbi = [
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
        rpcUrls: [import.meta.env.PUBLIC_CELO_RPC_URL ?? network.rpcUrl],
        blockExplorerUrls: [import.meta.env.PUBLIC_CELO_EXPLORER_URL ?? network.explorerUrl]
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
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

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
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f5f7fb" : "#090b0f");

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
  if (now - (window.jonakinhoLastThemeToggleAt ?? 0) < 250) {
    return;
  }
  window.jonakinhoLastThemeToggleAt = now;

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
    "badge-check": '<circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path>',
    "loader-circle": '<path d="M21 12a9 9 0 1 1-6.2-8.6"></path>',
    "log-in": '<path d="m10 17 5-5-5-5"></path><path d="M15 12H3"></path><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>',
    "pen-line": '<path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
    "rotate-ccw": '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"></path><path d="M3 3v5h5"></path>',
    "send": '<path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path>',
    "lock-keyhole": '<rect x="3" y="10" width="18" height="12" rx="2"></rect><path d="M7 10V7a5 5 0 0 1 10 0v3"></path><circle cx="12" cy="16" r="1"></circle>'
  };
  const spinClass = name === "loader-circle" ? " ui-icon--spin" : "";
  const body = icons[name] ?? '<circle cx="12" cy="12" r="10"></circle>';

  return `<svg class="ui-icon${spinClass}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

function setButtonHtml(button: HTMLElement, icon: string, label: string): void {
  button.innerHTML = `${iconSvg(icon)}${label}`;
}

function setAuthLoading(button: HTMLElement, isLoading: boolean): void {
  const root =
    button.closest<HTMLElement>("[data-auth-action-panel]") ??
    button.closest<HTMLElement>("[data-auth-form]") ??
    button.parentElement;

  if (!root) {
    return;
  }

  root.querySelector<HTMLElement>("[data-auth-loading]")?.remove();

  if (!isLoading) {
    return;
  }

  const skeleton = document.createElement("div");
  skeleton.className = "auth-loading";
  skeleton.dataset.authLoading = "true";
  skeleton.setAttribute("aria-hidden", "true");
  skeleton.innerHTML = [
    '<span class="skeleton-line" style="height: 12px; width: 75%" data-skeleton></span>',
    '<span class="skeleton-line" style="height: 12px; width: 50%" data-skeleton></span>'
  ].join("");
  root.append(skeleton);
}

function showCardLoading(card: HTMLElement | null | undefined): void {
  if (!card || card.querySelector("[data-loading-card]")) {
    return;
  }

  card.setAttribute("aria-busy", "true");
  const loading = document.createElement("div");
  loading.className = "loading-card";
  loading.dataset.loadingCard = "true";
  loading.setAttribute("aria-hidden", "true");
  loading.innerHTML = [
    '<span class="skeleton-line" style="height: 16px; width: 66%" data-skeleton></span>',
    '<span class="skeleton-line" style="height: 12px; width: 100%" data-skeleton></span>',
    '<span class="skeleton-line" style="height: 12px; width: 84%" data-skeleton></span>'
  ].join("");
  card.append(loading);
}

function hideCardLoading(card: HTMLElement | null | undefined): void {
  card?.removeAttribute("aria-busy");
  card?.querySelector("[data-loading-card]")?.remove();
}

function setSegmentState(button: HTMLElement, isActive: boolean): void {
  button.setAttribute("aria-checked", isActive ? "true" : "false");
  button.dataset.state = isActive ? "selected" : "idle";
}

function selectedStakeValue(card: HTMLElement): string {
  return card.querySelector<HTMLInputElement>("[data-custom-stake]")?.value.trim() ?? String(defaultStakeUsd);
}

function syncBetForm(card: HTMLElement): void {
  const outcomeButton = card.querySelector<HTMLElement>('[data-select-outcome][aria-checked="true"]');
  const stake = selectedStakeValue(card);
  const submitButton = card.querySelector<HTMLButtonElement>("[data-place-bet]");
  const outcome = outcomeButton?.dataset.outcome as Outcome | undefined;
  const isValid = Boolean(outcome && Number(stake) >= minimumStakeUsd);

  if (!submitButton) {
    return;
  }

  submitButton.disabled = !isValid;
  submitButton.dataset.outcome = outcome ?? "";
  submitButton.innerHTML = isValid
    ? `${iconSvg("send")}Confirmar palpite`
    : `${iconSvg("lock-keyhole")}Confirmar palpite`;
}

function selectOutcome(button: HTMLElement): void {
  const card = button.closest<HTMLElement>("[data-match-card]");

  if (!card) {
    return;
  }

  for (const option of card.querySelectorAll<HTMLElement>("[data-select-outcome]")) {
    setSegmentState(option, option === button);
  }

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
    throw new Error("Entre com MetaMask antes de confirmar na Celo");
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

  return fallback;
}

async function authenticateWithWallet(button: HTMLElement): Promise<void> {
  const intent = button.dataset.authIntent as AuthIntent | undefined;
  const provider = getProvider();

  if (intent !== "login" && intent !== "register") {
    return;
  }

  if (!provider) {
    setAuthStatus(button, "Carteira não encontrada. Abra no MiniPay ou instale MetaMask.", true);
    return;
  }

  if (provider.isMiniPay) {
    setAuthStatus(button, "No MiniPay, você pode confirmar palpites sem assinar login.");
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

    window.location.assign(authRedirect(button.dataset.authRedirect));
  } catch (error) {
    const message = errorMessage(error, "Autenticação cancelada");

    if (message === "Carteira ainda não cadastrada") {
      window.location.assign(`/register?next=${encodeURIComponent(authRedirect(button.dataset.authRedirect))}`);
      return;
    }

    setAuthStatus(button, message, true);
    button.innerHTML = originalHtml;
  } finally {
    setAuthLoading(button, false);
    button.removeAttribute("disabled");
  }
}

async function logout(): Promise<void> {
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
}): Promise<string> {
  const provider = getProvider();
  const { matchId, onchainMatchId, outcome, tokenSymbol, stakeUsd } = options;

  if (!provider || poolsAddress === emptyContractAddress) {
    return submitLocalConfirmation(matchId, outcome);
  }

  const session = provider.isMiniPay ? null : await requireAuthSession();
  await ensureCeloNetwork(provider);
  const account = await requestAccount(provider);

  if (session && session.user.walletAddress.toLowerCase() !== account.toLowerCase()) {
    throw new Error("Use a mesma carteira do login para confirmar o palpite");
  }

  const token = selectedStablecoin(tokenSymbol);
  const tokenAddress = getTokenAddress(token.symbol, chainId);
  const feeCurrency = getFeeCurrencyAddress(token.symbol, chainId);

  if (!tokenAddress) {
    throw new Error("Dólar digital indisponível nesta rede");
  }

  const [{ createWalletClient, custom, encodeFunctionData, parseUnits, stringToHex }, { celo, celoSepolia }] =
    await Promise.all([import("viem"), import("viem/chains")]);
  const chain = chainId === celo.id ? celo : celoSepolia;
  const wallet = createWalletClient({
    account,
    chain,
    transport: custom(provider)
  });

  const amount = parseUnits(stakeUsd, token.decimals);
  const approveData = encodeFunctionData({
    abi: erc20ApproveAbi,
    functionName: "approve",
    args: [poolsAddress, amount]
  });
  const data = encodeFunctionData({
    abi: jonakinhoPoolsAbi,
    functionName: "placeBet",
    args: [resolveOnchainMatchId(matchId, stringToHex, onchainMatchId), normalizeOutcome(outcome), tokenAddress, amount]
  });

  await wallet.sendTransaction({
    account,
    to: tokenAddress,
    data: approveData,
    feeCurrency: feeCurrency ?? undefined
  });

  const txHash = await wallet.sendTransaction({
    account,
    to: poolsAddress,
    data,
    feeCurrency: feeCurrency ?? undefined
  });

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

function swapCard(button: HTMLElement, html: string): void {
  const card = button.closest("[data-match-card]");

  if (!card) {
    return;
  }

  if (window.htmx) {
    window.htmx.swap(card, html, { swapStyle: "outerHTML" });
    return;
  }

  card.outerHTML = html;
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
    await logout();
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
      await ensureCeloNetwork(provider);
      await requestAccount(provider);
      setButtonHtml(connectButton, "badge-check", "Conectado");
    }
    return;
  }

  const betButton = target.closest<HTMLElement>("[data-place-bet]");

  if (!betButton) {
    return;
  }

  const card = betButton.closest<HTMLElement>("[data-match-card]");
  const matchId = betButton.dataset.matchId ?? card?.dataset.matchId;
  const outcome = betButton.dataset.outcome as Outcome | undefined;
  const stakeUsd = card ? selectedStakeValue(card) : String(defaultStakeUsd);
  const tokenSymbol = card?.querySelector<HTMLElement>('[data-select-token][aria-checked="true"]')?.dataset
    .tokenSymbol as StablecoinSymbol | undefined;

  if (
    !matchId ||
    (outcome !== "HOME" && outcome !== "DRAW" && outcome !== "AWAY") ||
    !Number.isFinite(Number(stakeUsd)) ||
    Number(stakeUsd) < minimumStakeUsd
  ) {
    if (card) {
      syncBetForm(card);
    }
    return;
  }

  betButton.setAttribute("disabled", "true");
  betButton.innerHTML = `${iconSvg("loader-circle")}Confirmando`;
  showCardLoading(card);

  try {
    const html = await placeBet({
      matchId,
      onchainMatchId: betButton.dataset.matchOnchainId ?? card?.dataset.matchOnchainId,
      outcome,
      tokenSymbol,
      stakeUsd
    });
    swapCard(betButton, html);
  } catch (error) {
    hideCardLoading(card);
    betButton.removeAttribute("disabled");
    betButton.innerHTML = `${iconSvg("rotate-ccw")}Tentar de novo`;
    console.error(error);
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

  syncBetForm(card);
}

function bindGlobalListeners(): void {
  if (window.jonakinhoEventsBound) {
    return;
  }

  document.addEventListener("click", (event) => {
    void handleDocumentClick(event);
  });
  document.addEventListener("keydown", handleGroupKeydown);
  document.addEventListener("keydown", handleSegmentKeydown);
  document.addEventListener("input", handleDocumentInput);
  document.addEventListener("astro:page-load", initPage);
  window.jonakinhoEventsBound = true;
}

function initPage(): void {
  initTheme();
  updateNavigationState();
  initGroupTabs();
  initBetForms();
  initMatchFilters();
  void refreshAuthSession().catch(() => undefined);
  window.jonakinhoReady = true;
}

bindGlobalListeners();

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initPage, { once: true });
} else {
  initPage();
}
