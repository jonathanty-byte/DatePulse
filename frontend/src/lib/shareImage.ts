import type { WrappedMetrics } from "./wrappedMetrics";

export type ShareTemplate = "story" | "square";

// App-source tinting colors (darker shades for gradient midpoint)
const APP_TINT: Record<string, string> = {
  tinder: "#be185d",   // pink-700
  bumble: "#b45309",   // amber-700
  hinge: "#6d28d9",    // violet-700
};

/** Generate a shareable image from wrapped metrics. */
export async function generateShareImage(
  metrics: WrappedMetrics,
  template: ShareTemplate = "story"
): Promise<Blob> {
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
  const statGap = template === "story" ? 150 : 120;

  const stats = [
    { value: `${metrics.totalSwipes}`, label: "Swipes" },
    { value: `${metrics.rightSwipeRate}%`, label: "Taux de like" },
    { value: `${metrics.swipeToMatchRate}%`, label: "Conversion" },
    { value: `${metrics.hoursPerMatch}h`, label: "Par match obtenu" },
    { value: `${metrics.estimatedTotalHours}h`, label: "Temps total" },
    {
      value: `${metrics.matchesInGreenLightPct}%`,
      label: "Matches en momentum",
    },
  ];

  // Show first 4 stats for square, all 6 for story
  const displayStats = template === "square" ? stats.slice(0, 4) : stats;

  displayStats.forEach((stat, i) => {
    const y = statsStartY + i * statGap;

    // Stat value
    ctx.font =
      "bold 80px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
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
