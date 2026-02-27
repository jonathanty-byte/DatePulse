import { callLLM } from "./llmService";
import type { TextContent, ImageContent } from "./llmService";
import { resizeImage } from "./profileAudit";

// ── Types ───────────────────────────────────────────────────────

export type CoachContext = "stale" | "date_propose" | "relaunch";

export interface CoachSuggestion {
  text: string;
  strategy: string;
  explanation: string;
}

export interface CoachResult {
  diagnostic: string;
  suggestions: CoachSuggestion[];
}

// ── Context labels ──────────────────────────────────────────────

const CONTEXT_LABELS: Record<CoachContext, string> = {
  stale: "La conversation stagne — elle repond peu ou avec des messages courts",
  date_propose: "Tu veux proposer un date mais tu ne sais pas comment",
  relaunch: "Elle n'a pas repondu depuis un moment et tu veux relancer",
};

// ── System prompt ───────────────────────────────────────────────

function buildCoachPrompt(context: CoachContext): string {
  return `Tu es un coach en communication pour les apps de dating. L'utilisateur te montre une conversation et a besoin d'aide.

Contexte : ${CONTEXT_LABELS[context]}

Analyse la conversation et fournis :
1. Un diagnostic court (2-3 phrases) de la dynamique de la conversation
2. Exactement 3 suggestions de messages a envoyer, du plus conservateur au plus audacieux

Fournis en JSON strict (pas de markdown, pas de backticks, pas de texte autour) :
{
  "diagnostic": "...",
  "suggestions": [
    {"text": "Le message exact a envoyer", "strategy": "Conservateur|Equilibre|Audacieux", "explanation": "Pourquoi ce message fonctionne (1 phrase)"},
    {"text": "...", "strategy": "...", "explanation": "..."},
    {"text": "...", "strategy": "...", "explanation": "..."}
  ]
}

Regles :
- Les messages suggeres doivent etre naturels, pas generiques. Refere-toi a des elements de la conversation.
- Chaque message doit etre pret a etre copie-colle.
- Conservateur = safe, poli, relance douce. Equilibre = interessant, montre de la personnalite. Audacieux = direct, assume, prend un risque.
- Langue : francais.
- Si la conversation contient des screenshots, analyse les messages visibles.`;
}

// ── Main function ───────────────────────────────────────────────

export async function analyzeConversation(input: {
  text?: string;
  images?: File[];
}, context: CoachContext): Promise<CoachResult> {
  if (!input.text && (!input.images || input.images.length === 0)) {
    throw new Error("Fournis du texte ou des screenshots de ta conversation.");
  }

  const userContent: (TextContent | ImageContent)[] = [];

  // Add text if provided
  if (input.text && input.text.trim().length > 0) {
    userContent.push({
      type: "text",
      text: `Voici la conversation :\n\n${input.text.trim()}`,
    });
  }

  // Add images if provided
  if (input.images && input.images.length > 0) {
    if (!input.text) {
      userContent.push({
        type: "text",
        text: "Voici les screenshots de la conversation :",
      });
    }
    const base64Images = await Promise.all(
      input.images.map((file) => resizeImage(file))
    );
    for (const url of base64Images) {
      userContent.push({
        type: "image_url",
        image_url: { url },
      });
    }
  }

  const raw = await callLLM({
    systemPrompt: buildCoachPrompt(context),
    userContent,
    maxTokens: 1500,
    temperature: 0.5,
  });

  return parseCoachResult(raw);
}

// ── JSON parsing ────────────────────────────────────────────────

function parseCoachResult(raw: string): CoachResult {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("L'IA n'a pas retourne un JSON valide. Reessaie.");
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error("Impossible de parser la reponse de l'IA.");
    }
  }

  const diagnostic = typeof parsed.diagnostic === "string"
    ? parsed.diagnostic
    : "Analyse non disponible.";

  const suggestions: CoachSuggestion[] = [];
  if (Array.isArray(parsed.suggestions)) {
    for (const s of parsed.suggestions.slice(0, 3)) {
      suggestions.push({
        text: String(s?.text ?? ""),
        strategy: String(s?.strategy ?? ""),
        explanation: String(s?.explanation ?? ""),
      });
    }
  }

  if (suggestions.length === 0) {
    throw new Error("L'IA n'a pas genere de suggestions. Reessaie.");
  }

  return { diagnostic, suggestions };
}
