export const config = { runtime: "edge" };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Basic validation: messages array is required
  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as Record<string, unknown>).messages)
  ) {
    return new Response(
      JSON.stringify({ error: "Request body must include a messages array" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Server-side enforcement: force model and cap max_tokens to prevent abuse
  const ALLOWED_MODEL = "openrouter/quasar-alpha";
  const MAX_TOKENS_CAP = 1024;
  const sanitizedBody = {
    ...(body as Record<string, unknown>),
    model: ALLOWED_MODEL,
    max_tokens: Math.min(
      Number((body as Record<string, unknown>).max_tokens) || MAX_TOKENS_CAP,
      MAX_TOKENS_CAP
    ),
  };

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://datepulse.app",
        "X-Title": "DatePulse",
      },
      body: JSON.stringify(sanitizedBody),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to proxy to OpenRouter" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
