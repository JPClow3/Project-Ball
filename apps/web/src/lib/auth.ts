import { getAddress, isAddress, verifyMessage } from "viem";
import { appConfig } from "./config";

export type AuthIntent = "login" | "register";

export type AuthUser = {
  readonly id: string;
  readonly walletAddress: `0x${string}`;
  readonly displayName: string | null;
  readonly registeredAt: string;
  readonly lastLoginAt: string | null;
};

export type AuthSession = {
  readonly id: string;
  readonly user: AuthUser;
  readonly expiresAt: string;
};

type D1 = RuntimeEnv["PROJECT_BALL_DB"];

type AuthChallenge = {
  readonly nonce: string;
  readonly walletAddress: `0x${string}`;
  readonly intent: AuthIntent;
  readonly message: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly consumedAt: string | null;
};

type AuthStore = {
  readonly challenges: Map<string, AuthChallenge>;
  readonly users: Map<string, AuthUser>;
  readonly sessions: Map<string, AuthSession>;
};

type ChallengeRow = {
  readonly nonce: string;
  readonly wallet_address: string;
  readonly intent: AuthIntent;
  readonly message: string;
  readonly issued_at: string;
  readonly expires_at: string;
  readonly consumed_at: string | null;
};

type UserRow = {
  readonly id: string;
  readonly wallet_address: string;
  readonly display_name: string | null;
  readonly registered_at: string;
  readonly last_login_at: string | null;
};

type SessionRow = UserRow & {
  readonly session_id: string;
  readonly session_expires_at: string;
};

const SESSION_COOKIE = "project_ball_session";
const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const fallbackStore = globalThis as typeof globalThis & {
  __projectBallAuthStore?: AuthStore;
};

function getMemoryStore(): AuthStore {
  fallbackStore.__projectBallAuthStore ??= {
    challenges: new Map(),
    users: new Map(),
    sessions: new Map()
  };

  return fallbackStore.__projectBallAuthStore;
}

function nowIso(): string {
  return new Date().toISOString();
}

function expiresAt(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function isMissingAuthTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const KNOWN_AUTH_TABLES = ["wallet_auth_nonces", "wallet_users", "wallet_sessions"];
  return KNOWN_AUTH_TABLES.some((t) => message.includes(`no such table: ${t}`));
}

function toUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    walletAddress: getAddress(row.wallet_address) as `0x${string}`,
    displayName: row.display_name,
    registeredAt: row.registered_at,
    lastLoginAt: row.last_login_at
  };
}

function toChallenge(row: ChallengeRow): AuthChallenge {
  return {
    nonce: row.nonce,
    walletAddress: getAddress(row.wallet_address) as `0x${string}`,
    intent: row.intent,
    message: row.message,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at
  };
}

export function parseAuthIntent(value: unknown): AuthIntent | null {
  return value === "login" || value === "register" ? value : null;
}

export function normalizeWalletAddress(value: unknown): `0x${string}` | null {
  if (typeof value !== "string" || !isAddress(value)) {
    return null;
  }

  return getAddress(value) as `0x${string}`;
}

export function normalizeSignature(value: unknown): `0x${string}` | null {
  return typeof value === "string" && /^0x(?:[a-fA-F0-9]{128}|[a-fA-F0-9]{130})$/.test(value)
    ? (value as `0x${string}`)
    : null;
}

export function normalizeNonce(value: unknown): string | null {
  return typeof value === "string" && /^nonce_[a-f0-9]{32}$/.test(value) ? value : null;
}

export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const displayName = value.trim().slice(0, 48);
  return displayName.length > 0 ? displayName : null;
}

export function buildAuthMessage(options: {
  readonly walletAddress: `0x${string}`;
  readonly intent: AuthIntent;
  readonly nonce: string;
  readonly origin: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
}): string {
  const action = options.intent === "register" ? "criar sua conta" : "entrar";

  return [
    `${appConfig.appName} solicita assinatura para ${action}.`,
    "",
    `Carteira: ${options.walletAddress}`,
    `Domínio: ${new URL(options.origin).host}`,
    `URI: ${options.origin}`,
    `Chain ID: ${appConfig.chainId}`,
    `Nonce: ${options.nonce}`,
    `Criado em: ${options.issuedAt}`,
    `Expira em: ${options.expiresAt}`,
    "",
    "Esta assinatura não autoriza transação nem gasto de saldo."
  ].join("\n");
}

export async function createAuthChallenge(
  db: D1,
  walletAddress: `0x${string}`,
  intent: AuthIntent,
  origin: string
): Promise<AuthChallenge> {
  const issuedAt = nowIso();
  const challenge: AuthChallenge = {
    nonce: makeId("nonce"),
    walletAddress,
    intent,
    issuedAt,
    expiresAt: expiresAt(NONCE_TTL_MS),
    consumedAt: null,
    message: ""
  };
  const message = buildAuthMessage({ ...challenge, origin });
  const challengeWithMessage = { ...challenge, message };

  if (db) {
    try {
      await db
        .prepare(
          `INSERT INTO wallet_auth_nonces (nonce, wallet_address, intent, message, issued_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          challengeWithMessage.nonce,
          challengeWithMessage.walletAddress,
          challengeWithMessage.intent,
          challengeWithMessage.message,
          challengeWithMessage.issuedAt,
          challengeWithMessage.expiresAt
        )
        .run();
      return challengeWithMessage;
    } catch (error) {
      if (!isMissingAuthTable(error)) {
        throw error;
      }
    }
  }

  getMemoryStore().challenges.set(challengeWithMessage.nonce, challengeWithMessage);
  return challengeWithMessage;
}

async function consumeChallenge(
  db: D1,
  walletAddress: `0x${string}`,
  intent: AuthIntent,
  nonce: string
): Promise<AuthChallenge | null> {
  const currentTime = nowIso();

  if (db) {
    try {
      const row = await db
        .prepare(
          `SELECT nonce, wallet_address, intent, message, issued_at, expires_at, consumed_at
           FROM wallet_auth_nonces
           WHERE nonce = ? AND wallet_address = ? AND intent = ? AND consumed_at IS NULL
           LIMIT 1`
        )
        .bind(nonce, walletAddress, intent)
        .first<ChallengeRow>();

      if (!row || row.expires_at <= currentTime) {
        return null;
      }

      await db
        .prepare("UPDATE wallet_auth_nonces SET consumed_at = ? WHERE nonce = ?")
        .bind(currentTime, row.nonce)
        .run();

      return toChallenge(row);
    } catch (error) {
      if (!isMissingAuthTable(error)) {
        throw error;
      }
    }
  }

  const store = getMemoryStore();
  const challenge = store.challenges.get(nonce) ?? null;

  if (
    !challenge ||
    challenge.walletAddress.toLowerCase() !== walletAddress.toLowerCase() ||
    challenge.intent !== intent ||
    challenge.expiresAt <= currentTime ||
    challenge.consumedAt
  ) {
    return null;
  }

  store.challenges.set(nonce, { ...challenge, consumedAt: currentTime });
  return challenge;
}

async function findUser(db: D1, walletAddress: `0x${string}`): Promise<AuthUser | null> {
  if (db) {
    try {
      const row = await db
        .prepare(
          `SELECT id, wallet_address, display_name, registered_at, last_login_at
           FROM wallet_users
           WHERE wallet_address = ?`
        )
        .bind(walletAddress)
        .first<UserRow>();

      return row ? toUser(row) : null;
    } catch (error) {
      if (!isMissingAuthTable(error)) {
        throw error;
      }
    }
  }

  return getMemoryStore().users.get(walletAddress.toLowerCase()) ?? null;
}

async function upsertUser(
  db: D1,
  walletAddress: `0x${string}`,
  displayName: string | null
): Promise<AuthUser> {
  const loginAt = nowIso();

  if (db) {
    try {
      const existing = await findUser(db, walletAddress);
      const userId = existing?.id ?? makeId("user");
      const registeredAt = existing?.registeredAt ?? loginAt;

      await db
        .prepare(
          `INSERT INTO wallet_users (id, wallet_address, display_name, registered_at, last_login_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(wallet_address) DO UPDATE SET
             display_name = COALESCE(excluded.display_name, wallet_users.display_name),
             last_login_at = excluded.last_login_at`
        )
        .bind(userId, walletAddress, displayName, registeredAt, loginAt)
        .run();

      const user = await findUser(db, walletAddress);
      if (!user) {
        throw new Error("Nao foi possivel criar a conta");
      }

      return user;
    } catch (error) {
      if (!isMissingAuthTable(error)) {
        throw error;
      }
      // fall through to memory store below
    }
  }

  const store = getMemoryStore();
  const key = walletAddress.toLowerCase();
  const existing = store.users.get(key);
  const user: AuthUser = {
    id: existing?.id ?? makeId("user"),
    walletAddress,
    displayName: displayName ?? existing?.displayName ?? null,
    registeredAt: existing?.registeredAt ?? loginAt,
    lastLoginAt: loginAt
  };

  store.users.set(key, user);
  return user;
}

async function touchLogin(db: D1, user: AuthUser): Promise<AuthUser> {
  const loginAt = nowIso();

  if (db) {
    try {
      await db
        .prepare("UPDATE wallet_users SET last_login_at = ? WHERE id = ?")
        .bind(loginAt, user.id)
        .run();

      return { ...user, lastLoginAt: loginAt };
    } catch (error) {
      if (!isMissingAuthTable(error)) {
        throw error;
      }
    }
  }

  const updated = { ...user, lastLoginAt: loginAt };
  getMemoryStore().users.set(user.walletAddress.toLowerCase(), updated);
  return updated;
}

async function createSession(db: D1, user: AuthUser): Promise<AuthSession> {
  const session: AuthSession = {
    id: makeId("session"),
    user,
    expiresAt: expiresAt(SESSION_TTL_MS)
  };

  if (db) {
    try {
      await db
        .prepare(
          `INSERT INTO wallet_sessions (id, user_id, wallet_address, created_at, expires_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(session.id, user.id, user.walletAddress, nowIso(), session.expiresAt)
        .run();
      return session;
    } catch (error) {
      if (!isMissingAuthTable(error)) {
        throw error;
      }
    }
  }

  getMemoryStore().sessions.set(session.id, session);
  return session;
}

async function verifyChallenge(options: {
  readonly db: D1;
  readonly walletAddress: `0x${string}`;
  readonly intent: AuthIntent;
  readonly nonce: string;
  readonly signature: `0x${string}`;
}): Promise<boolean> {
  const challenge = await consumeChallenge(options.db, options.walletAddress, options.intent, options.nonce);

  if (!challenge) {
    return false;
  }

  try {
    return await verifyMessage({
      address: options.walletAddress,
      message: challenge.message,
      signature: options.signature
    });
  } catch {
    return false;
  }
}

export async function registerWithWallet(options: {
  readonly db: D1;
  readonly walletAddress: `0x${string}`;
  readonly nonce: string;
  readonly signature: `0x${string}`;
  readonly displayName: string | null;
}): Promise<AuthSession | null> {
  const verified = await verifyChallenge({
    db: options.db,
    walletAddress: options.walletAddress,
    intent: "register",
    nonce: options.nonce,
    signature: options.signature
  });

  if (!verified) {
    return null;
  }

  const user = await upsertUser(options.db, options.walletAddress, options.displayName);
  return createSession(options.db, user);
}

export async function loginWithWallet(options: {
  readonly db: D1;
  readonly walletAddress: `0x${string}`;
  readonly nonce: string;
  readonly signature: `0x${string}`;
}): Promise<AuthSession | null | "not_registered"> {
  const verified = await verifyChallenge({
    db: options.db,
    walletAddress: options.walletAddress,
    intent: "login",
    nonce: options.nonce,
    signature: options.signature
  });

  if (!verified) {
    return null;
  }

  const user = await findUser(options.db, options.walletAddress);

  if (!user) {
    return "not_registered";
  }

  return createSession(options.db, await touchLogin(options.db, user));
}

export async function createMiniPaySession(options: {
  readonly db: D1;
  readonly walletAddress: `0x${string}`;
  readonly displayName: string | null;
}): Promise<AuthSession> {
  const user = await upsertUser(options.db, options.walletAddress, options.displayName);
  return createSession(options.db, user);
}

export function readSessionId(request: Request): string | null {
  const cookie = request.headers.get("cookie");

  if (!cookie) {
    return null;
  }

  const parts = cookie.split(";").map((part) => part.trim());
  const sessionPart = parts.find((part) => part.startsWith(`${SESSION_COOKIE}=`));

  if (!sessionPart) {
    return null;
  }

  try {
    const sessionId = decodeURIComponent(sessionPart.slice(SESSION_COOKIE.length + 1));
    return sessionId || null;
  } catch {
    return null;
  }
}

export async function getSession(db: D1, request: Request): Promise<AuthSession | null> {
  const sessionId = readSessionId(request);
  const currentTime = nowIso();

  if (!sessionId) {
    return null;
  }

  if (db) {
    try {
      const row = await db
        .prepare(
          `SELECT
             wallet_sessions.id AS session_id,
             wallet_sessions.expires_at AS session_expires_at,
             wallet_users.id,
             wallet_users.wallet_address,
             wallet_users.display_name,
             wallet_users.registered_at,
             wallet_users.last_login_at
           FROM wallet_sessions
           JOIN wallet_users ON wallet_users.id = wallet_sessions.user_id
           WHERE wallet_sessions.id = ?
             AND wallet_sessions.revoked_at IS NULL
             AND wallet_sessions.expires_at > ?
           LIMIT 1`
        )
        .bind(sessionId, currentTime)
        .first<SessionRow>();

      if (!row) {
        return null;
      }

      return {
        id: row.session_id,
        user: toUser(row),
        expiresAt: row.session_expires_at
      };
    } catch (error) {
      if (!isMissingAuthTable(error)) {
        throw error;
      }
    }
  }

  const session = getMemoryStore().sessions.get(sessionId) ?? null;

  if (!session || session.expiresAt <= currentTime) {
    return null;
  }

  return session;
}

export async function revokeSession(db: D1, request: Request): Promise<void> {
  const sessionId = readSessionId(request);

  if (!sessionId) {
    return;
  }

  if (db) {
    try {
      await db
        .prepare("UPDATE wallet_sessions SET revoked_at = ? WHERE id = ?")
        .bind(nowIso(), sessionId)
        .run();
      return;
    } catch (error) {
      if (!isMissingAuthTable(error)) {
        throw error;
      }
    }
  }

  getMemoryStore().sessions.delete(sessionId);
}

export function makeSessionCookie(session: AuthSession, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const maxAge = Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000);
  return `${SESSION_COOKIE}=${encodeURIComponent(session.id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function makeClearSessionCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function toPublicSession(session: AuthSession) {
  return {
    authenticated: true,
    user: {
      walletAddress: session.user.walletAddress,
      displayName: session.user.displayName,
      registeredAt: session.user.registeredAt,
      lastLoginAt: session.user.lastLoginAt
    },
    expiresAt: session.expiresAt
  };
}
