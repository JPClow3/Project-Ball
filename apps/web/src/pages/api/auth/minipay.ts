import type { APIRoute } from "astro";

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers
    }
  });
}

export const POST: APIRoute = async () => {
  return json(
    {
      error: "MiniPay precisa assinar a mensagem de autenticação.",
      code: "signed_auth_required"
    },
    { status: 410 }
  );
};
