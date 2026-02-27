import type { WrappedMetrics } from "./wrappedMetrics";

export type ShareTemplate = "story" | "square";

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

  // Background gradient (dark theme matching DateDetox)
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#030712"); // gray-950
  gradient.addColorStop(0.5, "#1a0a2e"); // brand dark purple
  gradient.addColorStop(1, "#030712"); // gray-950
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
  circleGradient.addColorStop(0, "rgba(236, 72, 153, 0.15)"); // brand-500
  circleGradient.addColorStop(1, "rgba(236, 72, 153, 0)");
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
  titleGrad.addColorStop(0, "#f472b6"); // brand-400
  titleGrad.addColorStop(1, "#db2777"); // brand-600
  ctx.fillStyle = titleGrad;
  ctx.fillText("DATING WRAPPED", width / 2, titleY);

  // Period
  ctx.font =
    "400 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#9ca3af"; // gray-400
  const periodText = `${metrics.periodStart.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })} — ${metrics.periodEnd.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}`;
  ctx.fillText(periodText, width / 2, titleY + 50);

  // Stats section
  const statsStartY = template === "story" ? 400 : 260;
  const statGap = template === "story" ? 200 : 130;

  const stats = [
    { value: `${metrics.totalSwipes}`, label: "Swipes" },
    { value: `${metrics.rightSwipeRate}%`, label: "Taux de like" },
    { value: `${metrics.swipeToMatchRate}%`, label: "Conversion" },
    { value: `${metrics.estimatedTotalHours}h`, label: "Temps total" },
    {
      value: `${metrics.matchesInGreenLightPct}%`,
      label: "Matches en Green Light",
    },
  ];

  // Only show first 4 stats for square format
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
    statGrad.addColorStop(0, "#f472b6");
    statGrad.addColorStop(1, "#34d399");
    ctx.fillStyle = statGrad;
    ctx.fillText(stat.value, width / 2, y);

    // Stat label
    ctx.font =
      "400 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = "#6b7280"; // gray-500
    ctx.fillText(stat.label, width / 2, y + 45);
  });

  // Branding footer
  const brandingY = height - (template === "story" ? 120 : 60);
  ctx.font =
    "bold 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const brandGrad = ctx.createLinearGradient(
    width * 0.3,
    brandingY - 20,
    width * 0.7,
    brandingY + 20
  );
  brandGrad.addColorStop(0, "#f472b6");
  brandGrad.addColorStop(1, "#db2777");
  ctx.fillStyle = brandGrad;
  ctx.fillText("DateDetox", width / 2, brandingY);

  ctx.font =
    "400 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = "#4b5563"; // gray-600
  ctx.fillText("Swipe less. Match more.", width / 2, brandingY + 40);

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
