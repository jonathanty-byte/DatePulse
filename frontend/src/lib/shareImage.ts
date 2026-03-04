import type { WrappedMetrics } from "./wrappedMetrics";
import type { ConversationInsights } from "./conversationIntelligence";

export type ShareTemplate = "story" | "square" | "conversation";

// App-source tinting colors (darker shades for gradient midpoint)
const APP_TINT: Record<string, string> = {
  tinder: "#be185d",   // pink-700
  bumble: "#b45309",   // amber-700
  hinge: "#6d28d9",    // violet-700
};

/** Generate a shareable image from wrapped metrics. */
export async function generateShareImage(
  metrics: WrappedMetrics,
  template: ShareTemplate = "story",
  conversationInsights?: ConversationInsights
): Promise<Blob> {
  // Conversation Pulse template
  if (template === "conversation" && conversationInsights) {
    return generateConversationShareImage(conversationInsights, metrics.source);
  }

  const width = 1080;
  const height = template === "story" ? 1920 : 1080;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Background gradient (dark theme with app-source tint)
  const tint = APP_TINT[metrics.source] ?? "#1e1b4b";
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#080b14"); // dark
  gradient.addColorStop(0.5, tint);    // app-source tint
  gradient.addColorStop(1, "#080b14"); // dark
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Decorative gradient circle (top right)
  const circleGradient = ctx.createRadialGradient(
    width * 0.8,
    height * 0.1,
    0,
    width * 0.8,
    height * 0.1,
    300
  );
  circleGradient.addColorStop(0, "rgba(99, 102, 241, 0.15)"); // indigo-500
  circleGradient.addColorStop(1, "rgba(99, 102, 241, 0)");
  ctx.fillStyle = circleGradient;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.textAlign = "center";
  const titleY = template === "story" ? 200 : 120;

  ctx.font =
    "bold 72px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const titleGrad = ctx.createLinearGradient(
    width * 0.3,
    titleY - 50,
    width * 0.7,
    titleY + 50
  );
  titleGrad.addColorStop(0, "#818cf8"); // indigo-400
  titleGrad.addColorStop(1, "#4f46e5"); // indigo-600
  ctx.fillStyle = titleGrad;
  ctx.fillText("DATING WRAPPED", width / 2, titleY);

  // Period
  ctx.font =
    "400 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#9ca3af"; // gray-400
  const periodText = `${metrics.periodStart.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} — ${metrics.periodEnd.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}`;
  ctx.fillText(periodText, width / 2, titleY + 50);

  // Stats section — reduced gap, added 6th stat (hoursPerMatch)
  const statsStartY = template === "story" ? 400 : 260;
  const statGap = template === "story" ? 130 : 120;

  const stats: { value: string; label: string }[] = [
    { value: `${metrics.totalSwipes}`, label: "Swipes" },
    { value: `${metrics.rightSwipeRate}%`, label: "Taux de like" },
    { value: `${metrics.swipeToMatchRate}%`, label: "Conversion" },
    { value: `${metrics.hoursPerMatch}h`, label: "Par match obtenu" },
    { value: `${metrics.estimatedTotalHours}h`, label: "Temps total" },
    {
      value: `${metrics.matchesInGreenLightPct}%`,
      label: "Matches en momentum",
    },
    { value: `${metrics.ghostRate}%`, label: "Taux de ghosting" },
    { value: metrics.bestDay || "—", label: "Meilleur jour" },
  ];
  // Conditional stats 9-10: tenureMonths or avgConvoLength fallback, then sentReceivedRatio
  if (metrics.tenureMonths) {
    stats.push({ value: `${metrics.tenureMonths}`, label: "Mois sur l'app" });
  } else {
    stats.push({ value: `${metrics.avgConvoLength}`, label: "Messages / convo" });
  }
  if (metrics.sentReceivedRatio > 0) {
    stats.push({ value: `${metrics.sentReceivedRatio}x`, label: "Ratio msg envoi/recu" });
  }

  // Show first 4 stats for square, all 6 for story
  const displayStats = template === "square" ? stats.slice(0, 4) : stats;

  displayStats.forEach((stat, i) => {
    const y = statsStartY + i * statGap;

    // Stat value
    ctx.font =
      "bold 72px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    const statGrad = ctx.createLinearGradient(
      width * 0.3,
      y - 30,
      width * 0.7,
      y + 30
    );
    statGrad.addColorStop(0, "#818cf8"); // indigo-400
    statGrad.addColorStop(1, "#fbbf24"); // amber-400
    ctx.fillStyle = statGrad;
    ctx.fillText(stat.value, width / 2, y);

    // Stat label
    ctx.font =
      "400 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#6b7280"; // gray-500
    ctx.fillText(stat.label, width / 2, y + 45);
  });

  // Branding footer — pushed to height-100
  const brandingY = height - (template === "story" ? 100 : 60);
  ctx.font =
    "bold 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const brandGrad = ctx.createLinearGradient(
    width * 0.3,
    brandingY - 20,
    width * 0.7,
    brandingY + 20
  );
  brandGrad.addColorStop(0, "#818cf8"); // indigo-400
  brandGrad.addColorStop(1, "#4f46e5"); // indigo-600
  ctx.fillStyle = brandGrad;
  ctx.fillText("DatePulse", width / 2, brandingY);

  ctx.font =
    "400 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#4b5563"; // gray-600
  ctx.fillText("Swipe when it matters.", width / 2, brandingY + 40);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Impossible de generer l'image."));
      },
      "image/png",
      1
    );
  });
}

/** Generate Conversation Pulse share image (1080x1080 square). */
async function generateConversationShareImage(
  insights: ConversationInsights,
  source: string
): Promise<Blob> {
  const width = 1080;
  const height = 1080;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Background: dark with radial indigo
  ctx.fillStyle = "#080b14";
  ctx.fillRect(0, 0, width, height);
  const radial = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, 400);
  radial.addColorStop(0, "rgba(99, 102, 241, 0.12)");
  radial.addColorStop(1, "rgba(99, 102, 241, 0)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";

  // Title
  ctx.font = "bold 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const titleGrad = ctx.createLinearGradient(width * 0.3, 70, width * 0.7, 130);
  titleGrad.addColorStop(0, "#818cf8");
  titleGrad.addColorStop(1, "#4f46e5");
  ctx.fillStyle = titleGrad;
  ctx.fillText("CONVERSATION PULSE", width / 2, 110);

  // Source badge
  ctx.font = "400 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText(source.charAt(0).toUpperCase() + source.slice(1), width / 2, 150);

  // 3 SpotlightCard-like zones (ghost rate, score, archetype)
  const ghostPct = insights.ghostBreakdown.total > 0
    ? Math.round(((insights.ghostBreakdown.neverReplied + insights.ghostBreakdown.diedAtMsg2) / insights.ghostBreakdown.total) * 100)
    : 0;
  const scoreColor = insights.score >= 80 ? "#34d399" : insights.score >= 60 ? "#818cf8" : insights.score >= 40 ? "#fbbf24" : "#ef4444";

  const cardW = 300;
  const cardH = 130;
  const cardGap = 30;
  const cardsStartX = (width - 3 * cardW - 2 * cardGap) / 2;
  const cardY = 180;

  // Helper: draw a spotlight card
  const drawSpotlightCard = (x: number, y: number, value: string, label: string, color: string) => {
    // Card background with gradient
    ctx.save();
    const cardGrad = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
    cardGrad.addColorStop(0, `${color}15`);
    cardGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cardGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 16);
    ctx.fill();
    // Card border
    ctx.strokeStyle = `${color}40`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 16);
    ctx.stroke();
    ctx.restore();
    // Value
    ctx.font = "bold 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(value, x + cardW / 2, y + 60);
    // Label
    ctx.font = "400 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText(label, x + cardW / 2, y + 95);
  };

  drawSpotlightCard(cardsStartX, cardY, `${ghostPct}%`, "Ghost rate", "#ef4444");
  drawSpotlightCard(cardsStartX + cardW + cardGap, cardY, `${insights.score}/100`, "Score CDS", scoreColor);
  drawSpotlightCard(cardsStartX + 2 * (cardW + cardGap), cardY, insights.archetype, "Archetype", "#818cf8");

  // Conversations analyzed stat
  ctx.font = "400 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.textAlign = "center";
  ctx.fillText(`${insights.conversationsAnalyzed} conversations analysees`, width / 2, cardY + cardH + 50);

  // 5 mini bars (CDS breakdown) — enhanced with wider bars and labels
  const barY = cardY + cardH + 90;
  const barLabels = ["Questions", "Reactivite", "Openers", "Escalation", "Equilibre"];
  const barValues = [
    insights.scoreBreakdown.questionDensity,
    insights.scoreBreakdown.responseSpeed,
    insights.scoreBreakdown.openerQuality,
    insights.scoreBreakdown.escalationTiming,
    insights.scoreBreakdown.conversationBalance,
  ];
  const barWidth = 650;
  const barHeight = 16;
  const barGap = 50;
  const barStartX = (width - barWidth) / 2;

  barLabels.forEach((label, i) => {
    const y = barY + i * barGap;
    // Label
    ctx.font = "500 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#9ca3af";
    ctx.textAlign = "right";
    ctx.fillText(label, barStartX - 20, y + barHeight / 2 + 7);
    // Background
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.roundRect(barStartX, y, barWidth, barHeight, 8);
    ctx.fill();
    // Fill — color varies per bar value
    const valColor = barValues[i] >= 15 ? "#34d399" : barValues[i] >= 10 ? scoreColor : barValues[i] >= 5 ? "#fbbf24" : "#ef4444";
    const fillWidth = (barValues[i] / 20) * barWidth;
    ctx.fillStyle = valColor;
    ctx.beginPath();
    ctx.roundRect(barStartX, y, fillWidth, barHeight, 8);
    ctx.fill();
    // Value
    ctx.textAlign = "left";
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "700 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(`${barValues[i]}/20`, barStartX + barWidth + 15, y + barHeight / 2 + 7);
  });

  // Branding footer
  ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const brandGrad = ctx.createLinearGradient(width * 0.3, height - 120, width * 0.7, height - 80);
  brandGrad.addColorStop(0, "#818cf8");
  brandGrad.addColorStop(1, "#4f46e5");
  ctx.fillStyle = brandGrad;
  ctx.fillText("DatePulse — Conversation Pulse", width / 2, height - 80);

  ctx.font = "400 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#4b5563";
  ctx.fillText("Swipe when it matters.", width / 2, height - 45);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Impossible de generer l'image."));
      },
      "image/png",
      1
    );
  });
}

/** Share or download the image. */
export async function shareImage(
  blob: Blob,
  title: string = "Mon Dating Wrapped"
): Promise<boolean> {
  // Try Web Share API first
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], "dating-wrapped.png", { type: "image/png" });
    const shareData = { title, files: [file] };

    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (err) {
        // User cancelled or share failed — fall through to download
        if ((err as Error).name === "AbortError") return false;
      }
    }
  }

  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dating-wrapped.png";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
