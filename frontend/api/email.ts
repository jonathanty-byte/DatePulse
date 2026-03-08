// Edge Function: captures early-access emails
// 1. Stores in Vercel KV (primary — audit trail for J+7 debrief)
// 2. Forwards to Beehiiv (secondary — newsletter, best-effort)
//
// Requires env vars in Vercel:
//   KV_REST_API_URL — auto-provisioned by Vercel KV Store
//   KV_REST_API_TOKEN — auto-provisioned by Vercel KV Store
//   BEEHIIV_API_KEY — API key from Beehiiv dashboard (optional)
//   BEEHIIV_PUBLICATION_ID — Publication ID from Beehiiv dashboard (optional)

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { email, source } = (await req.json()) as {
      email?: string;
      source?: string;
    };

    if (!email || !email.includes("@")) {
      return new Response("Invalid email", { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailSource = source || "early_access";

    // ── 1. Store in Vercel KV (primary storage) ──────────────────
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (kvUrl && kvToken) {
      try {
        // Use REST API directly to avoid bundling issues with @vercel/kv in Edge
        const kvKey = `email:${trimmedEmail}`;
        const kvValue = JSON.stringify({
          email: trimmedEmail,
          source: emailSource,
          timestamp: new Date().toISOString(),
          userAgent: req.headers.get("user-agent") || "unknown",
        });

        await fetch(`${kvUrl}/set/${encodeURIComponent(kvKey)}/${encodeURIComponent(kvValue)}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${kvToken}`,
          },
        });
      } catch {
        // KV storage failed — continue with Beehiiv (graceful degradation)
      }
    }

    // ── 2. Forward to Beehiiv (secondary — newsletter) ───────────
    const apiKey = process.env.BEEHIIV_API_KEY;
    const pubId = process.env.BEEHIIV_PUBLICATION_ID;

    if (apiKey && pubId) {
      try {
        await fetch(
          `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: trimmedEmail,
              utm_source: emailSource,
            }),
          }
        );
      } catch {
        // Beehiiv failed — email is already in KV, acceptable
      }
    }

    return new Response("OK", { status: 200 });
  } catch {
    return new Response("Server error", { status: 500 });
  }
}
