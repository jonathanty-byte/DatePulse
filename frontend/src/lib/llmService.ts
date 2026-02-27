// LLM service — Calls /api/llm edge function (prod) or OpenRouter directly (dev)

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const PROXY_URL = "/api/llm";
const DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324";
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;
const RETRYABLE_CODES = [429, 500, 502, 503];

// ── Types ───────────────────────────────────────────────────────

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image_url";
  image_url: { url: string }; // base64 data URL
}

export interface LLMCallOptions {
  model?: string;
  systemPrompt: string;
  userContent: (TextContent | ImageContent)[];
  maxTokens?: number;
  temperature?: number;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false
  ) {
    super(message);
    this.name = "LLMError";
  }
}

// ── Main function ───────────────────────────────────────────────

export async function callLLM(options: LLMCallOptions): Promise<string> {
  // Dev fallback: use VITE_OPENROUTER_KEY directly if present
  const devApiKey = import.meta.env.VITE_OPENROUTER_KEY as string | undefined;
  const useProxy = !devApiKey;

  const model = options.model ?? DEFAULT_MODEL;
  const body = {
    model,
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userContent },
    ],
    max_tokens: options.maxTokens ?? 2000,
    temperature: options.temperature ?? 0.3,
  };

  const url = useProxy ? PROXY_URL : OPENROUTER_URL;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!useProxy && devApiKey) {
    headers["Authorization"] = `Bearer ${devApiKey}`;
    headers["HTTP-Referer"] = "https://datepulse.app";
    headers["X-Title"] = "DatePulse";
  }

  let lastError: LLMError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        const retryable = RETRYABLE_CODES.includes(res.status);

        lastError = new LLMError(
          `API error ${res.status}: ${errorBody.slice(0, 200)}`,
          res.status,
          retryable
        );

        if (retryable && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        throw lastError;
      }

      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;

      if (typeof content !== "string" || content.trim().length === 0) {
        throw new LLMError("Reponse LLM vide ou invalide.", undefined, false);
      }

      return content.trim();
    } catch (err) {
      if (err instanceof LLMError) {
        lastError = err;
        if (!err.retryable || attempt >= MAX_RETRIES) throw err;
        continue;
      }

      // AbortError = timeout
      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = new LLMError("L'analyse a pris trop de temps (timeout 30s).", undefined, true);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        throw lastError;
      }

      // Network error
      throw new LLMError(
        "Erreur reseau. Verifie ta connexion internet.",
        undefined,
        true
      );
    }
  }

  throw lastError ?? new LLMError("Erreur inconnue.");
}
