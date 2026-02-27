import type { AppName } from "./data";
import { callLLM } from "./llmService";
import type { ImageContent, TextContent } from "./llmService";

// ── Types ───────────────────────────────────────────────────────

export interface AuditItem {
  title: string;
  detail: string;
  recommendation?: string; // absent for strengths
}

export interface AuditResult {
  score: number;            // 0-100
  critical: AuditItem[];    // max 3
  improvements: AuditItem[];// max 3
  strengths: AuditItem[];   // max 3
  potential_score: number;  // estimated score after fixes
}

// ── Rate limiting ───────────────────────────────────────────────

const RATE_LIMIT_KEY = "datepulse_last_audit";
const OLD_RATE_LIMIT_KEY = "datedetox_last_audit";
const RATE_LIMIT_DAYS = 30;

// Migrate old localStorage key (one-time)
try {
  if (!localStorage.getItem(RATE_LIMIT_KEY) && localStorage.getItem(OLD_RATE_LIMIT_KEY)) {
    localStorage.setItem(RATE_LIMIT_KEY, localStorage.getItem(OLD_RATE_LIMIT_KEY)!);
    localStorage.removeItem(OLD_RATE_LIMIT_KEY);
  }
} catch { /* ignore */ }

export function getLastAuditDate(): Date | null {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function isRateLimited(): boolean {
  const last = getLastAuditDate();
  if (!last) return false;
  const daysSince = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince < RATE_LIMIT_DAYS;
}

export function getNextAuditDate(): Date | null {
  const last = getLastAuditDate();
  if (!last) return null;
  return new Date(last.getTime() + RATE_LIMIT_DAYS * 24 * 60 * 60 * 1000);
}

function recordAudit(): void {
  localStorage.setItem(RATE_LIMIT_KEY, new Date().toISOString());
}

// ── Image processing ────────────────────────────────────────────

const MAX_IMAGE_WIDTH = 1920;

/** Resize image if wider than MAX_IMAGE_WIDTH, return base64 data URL. */
export function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= MAX_IMAGE_WIDTH) {
          // No resize needed
          resolve(reader.result as string);
          return;
        }

        const scale = MAX_IMAGE_WIDTH / img.width;
        const canvas = document.createElement("canvas");
        canvas.width = MAX_IMAGE_WIDTH;
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Impossible de charger l'image."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
    reader.readAsDataURL(file);
  });
}

// ── System prompt ───────────────────────────────────────────────

function buildSystemPrompt(app: AppName): string {
  const appName = app.charAt(0).toUpperCase() + app.slice(1);
  return `Tu es un expert en optimisation de profils de dating apps (${appName}). Analyse les screenshots du profil et fournis un audit structure.

Scoring (score /100) :
- Qualite des photos : 40% (eclairage, cadrage, resolution, variete de contextes, sourire, contact visuel)
- Bio / prompts : 20% (originalite, longueur, humour, conversation starters)
- Variete / storytelling : 20% (mix activites, social, voyage, lifestyle — pas que des selfies)
- Ordre des photos : 10% (la plus forte en premier, progression logique)
- Utilisation des features de l'app : 10% (prompts Hinge, Spotify anthem, interets)

Fournis en JSON strict (pas de markdown, pas de backticks, pas de texte autour) :
{
  "score": number,
  "critical": [{"title": "...", "detail": "...", "recommendation": "..."}],
  "improvements": [{"title": "...", "detail": "...", "recommendation": "..."}],
  "strengths": [{"title": "...", "detail": "..."}],
  "potential_score": number
}

Regles :
- Sois direct et honnete. Pas de compliments vides.
- Maximum 3 items par categorie.
- Chaque recommandation doit etre concrete et actionnable.
- Refere-toi aux etudes publiees (Hinge, Tinder) quand pertinent.
- Score moyen attendu : 40-60. Un 80+ est rare.
- Langue : francais.`;
}

// ── Main function ───────────────────────────────────────────────

export async function analyzeProfile(
  images: string[], // base64 data URLs
  app: AppName
): Promise<AuditResult> {
  if (images.length === 0) {
    throw new Error("Aucune image fournie.");
  }

  const userContent: (TextContent | ImageContent)[] = [
    {
      type: "text",
      text: `Analyse ce profil ${app.charAt(0).toUpperCase() + app.slice(1)} (${images.length} screenshot${images.length > 1 ? "s" : ""}).`,
    },
    ...images.map(
      (url): ImageContent => ({
        type: "image_url",
        image_url: { url },
      })
    ),
  ];

  const raw = await callLLM({
    systemPrompt: buildSystemPrompt(app),
    userContent,
    maxTokens: 2000,
    temperature: 0.3,
  });

  const result = parseAuditResult(raw);

  // Record successful audit for rate limiting
  recordAudit();

  return result;
}

// ── JSON parsing with validation ────────────────────────────────

function parseAuditResult(raw: string): AuditResult {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from surrounding text
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

  // Validate and clamp score
  const score = clamp(toNumber(parsed.score, 50), 0, 100);
  const potential_score = clamp(toNumber(parsed.potential_score, score + 15), score, 100);

  return {
    score,
    critical: parseItems(parsed.critical, 3),
    improvements: parseItems(parsed.improvements, 3),
    strengths: parseItems(parsed.strengths, 3),
    potential_score,
  };
}

function parseItems(raw: unknown, max: number): AuditItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, max).map((item) => ({
    title: String(item?.title ?? ""),
    detail: String(item?.detail ?? ""),
    recommendation: item?.recommendation ? String(item.recommendation) : undefined,
  })).filter((item) => item.title.length > 0);
}

function toNumber(val: unknown, fallback: number): number {
  if (typeof val === "number" && !isNaN(val)) return Math.round(val);
  if (typeof val === "string") {
    const n = Number(val);
    if (!isNaN(n)) return Math.round(n);
  }
  return fallback;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
