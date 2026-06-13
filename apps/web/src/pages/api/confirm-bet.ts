import type { APIRoute } from "astro";
import type { Outcome } from "@project-ball/shared";
import { getRuntimeEnv } from "../../lib/runtime";
import { getSession } from "../../lib/auth";
import { recordBetConfirmation } from "../../lib/bets";
import { isContractConfigured, isProductionMode } from "../../lib/config";
import { getMatch, withUserPick } from "../../lib/matches";
import { renderMatchCard } from "../../lib/render";

type ConfirmBetPayload = {
  readonly txHash: `0x${string}`;
  readonly matchId: string;
  readonly outcome: Outcome;
};

function isOutcome(value: unknown): value is Outcome {
  return value === "HOME" || value === "DRAW" || value === "AWAY";
}

function isTxHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function isLocalRequest(request: Request): boolean {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isMatchOpen(match: ReturnType<typeof getMatch>): boolean {
  return Boolean(match && match.status === "open");
}

function parseConfirmBetPayload(payload: unknown): ConfirmBetPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const matchId = record.matchId;

  if (!isTxHash(record.txHash) || typeof matchId !== "string" || matchId.trim() === "") {
    return null;
  }

  if (!isOutcome(record.outcome)) {
    return null;
  }

  return {
    txHash: record.txHash,
    matchId,
    outcome: record.outcome
  };
}

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get("content-type") ?? "";
  let payload: unknown;

  try {
    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else {
      const form = await request.formData();
      payload = Object.fromEntries(form.entries());
    }
  } catch {
    return new Response("Requisição malformada", { status: 400 });
  }

  try {
    const env = getRuntimeEnv();
    const parsed = parseConfirmBetPayload(payload);

    if (!parsed) {
      return new Response("Confirmação inválida", { status: 400 });
    }

    const contractConfigured = isContractConfigured();

    if (!contractConfigured) {
      if (!isLocalRequest(request) || isProductionMode()) {
        return new Response("Contrato Celo não configurado", { status: 503 });
      }

      const match = getMatch(parsed.matchId);

      if (!match) {
        return new Response("Partida não encontrada", { status: 404 });
      }
      if (!isMatchOpen(match)) {
        return new Response("Partida bloqueada para novos palpites", { status: 409 });
      }

      const session = await getSession(env.PROJECT_BALL_DB, request);
      await recordBetConfirmation(env.PROJECT_BALL_DB, {
        txHash: parsed.txHash,
        matchId: parsed.matchId,
        bettor: session?.user.walletAddress ?? null,
        outcome: parsed.outcome,
        token: null,
        amount: null,
        normalizedAmount: null
      });

      const html = renderMatchCard(withUserPick(match, parsed.outcome));

      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8"
        }
      });
    }

    const [{ confirmBetTransaction }, session] = await Promise.all([
      import("../../lib/chain"),
      getSession(env.PROJECT_BALL_DB, request)
    ]);
    const confirmation = await confirmBetTransaction(parsed.txHash);

    if (!confirmation || !confirmation.outcome || !confirmation.bettor) {
      return new Response("Transação Celo não encontrada ou sem evento BetPlaced", { status: 400 });
    }

    if (session && confirmation.bettor.toLowerCase() !== session.user.walletAddress.toLowerCase()) {
      return new Response("Transação pertence a outra carteira", { status: 403 });
    }

    const matchId = confirmation.matchId;
    const outcome: Outcome = confirmation.outcome;
    const match = getMatch(matchId);

    if (!match) {
      return new Response("Partida não encontrada", { status: 404 });
    }

    await recordBetConfirmation(env.PROJECT_BALL_DB, {
      txHash: parsed.txHash,
      matchId,
      bettor: confirmation.bettor,
      outcome,
      token: confirmation.token ?? null,
      amount: confirmation.amount ?? null,
      normalizedAmount: confirmation.normalizedAmount ?? confirmation.amount ?? null
    });

    const html = renderMatchCard(withUserPick(match, outcome));
    
    // Create a generic card without the specific user's pick for broadcast
    const genericHtml = renderMatchCard(match);

    import("@/lib/cache").then(({ deleteCache }) => {
      deleteCache(`matchcard:html:${match.id}`);
    }).catch(console.error);

    // Dynamic import to avoid circular dependency
    import("./sse").then(({ broadcastUpdate }) => {
      // Broadcast the generic MatchCard to update odds/pool sizes for all users
      broadcastUpdate({ type: "MatchCard", id: match.id, html: genericHtml });
    }).catch(console.error);

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    });
  } catch (error) {
    console.error("Error confirming bet:", error);
    return new Response("Erro ao verificar palpite na blockchain. Tente novamente.", { status: 500 });
  }
};
