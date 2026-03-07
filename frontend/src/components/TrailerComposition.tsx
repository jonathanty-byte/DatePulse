import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

// ── Scene 1: Big number reveal ──────────────────────────────────

function NumberScene({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const labelY = interpolate(
    spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 15 } }),
    [0, 1],
    [30, 0]
  );
  const labelOpacity = interpolate(frame, [8, 18], [0, 1], { extrapolateRight: "clamp" });

  // Exit fade
  const exitOpacity = interpolate(frame, [50, 60], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: opacity * exitOpacity,
        backgroundColor: "#f8f9fc",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            color,
            transform: `scale(${scale})`,
            fontFamily: "system-ui, -apple-system, sans-serif",
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "#64748b",
            marginTop: 16,
            opacity: labelOpacity,
            transform: `translateY(${labelY}px)`,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 2: Funnel bars animated ───────────────────────────────

function FunnelScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bars = [
    { label: "Swipes", value: "12,847", pct: 100, color: "#6366f1" },
    { label: "Matchs", value: "847", pct: 38, color: "#8b5cf6" },
    { label: "Conversations", value: "312", pct: 16, color: "#a78bfa" },
  ];

  const enterOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [55, 65], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fc",
        opacity: enterOpacity * exitOpacity,
        padding: "0 80px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 600 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#334155",
            marginBottom: 32,
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Funnel complet
        </div>
        {bars.map((bar, i) => {
          const delay = i * 8;
          const width = spring({
            frame: Math.max(0, frame - delay - 5),
            fps,
            config: { damping: 15, stiffness: 40 },
          });
          return (
            <div
              key={bar.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 110,
                  textAlign: "right",
                  fontSize: 15,
                  fontWeight: 500,
                  color: "#64748b",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {bar.label}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 36,
                  backgroundColor: "#e2e8f0",
                  borderRadius: 18,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${width * bar.pct}%`,
                    height: "100%",
                    backgroundColor: bar.color,
                    borderRadius: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "white",
                      fontFamily: "system-ui, sans-serif",
                      opacity: width > 0.5 ? 1 : 0,
                    }}
                  >
                    {bar.value}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: Heatmap grid fill ──────────────────────────────────

function HeatmapScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const data = [
    [0.05, 0.1, 0.3, 0.7, 0.9, 0.4],
    [0.05, 0.15, 0.4, 0.8, 0.95, 0.5],
    [0.05, 0.2, 0.5, 0.75, 0.85, 0.4],
    [0.05, 0.15, 0.4, 0.8, 0.9, 0.5],
    [0.1, 0.25, 0.5, 0.85, 1.0, 0.6],
    [0.2, 0.4, 0.7, 0.95, 1.0, 0.7],
    [0.2, 0.35, 0.6, 0.9, 0.95, 0.6],
  ];
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const hours = ["6h", "10h", "14h", "18h", "21h", "0h"];

  const enterOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [55, 65], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fc",
        opacity: enterOpacity * exitOpacity,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#334155",
            marginBottom: 24,
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Timing optimal
        </div>
        <div style={{ display: "flex", gap: 4, marginLeft: 48, marginBottom: 6 }}>
          {hours.map((h) => (
            <div
              key={h}
              style={{
                width: 52,
                fontSize: 12,
                color: "#94a3b8",
                textAlign: "center",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {h}
            </div>
          ))}
        </div>
        {data.map((row, d) => (
          <div key={d} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <div
              style={{
                width: 44,
                fontSize: 13,
                color: "#64748b",
                textAlign: "right",
                fontWeight: 500,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {days[d]}
            </div>
            {row.map((v, h) => {
              const cellDelay = d * 3 + h * 2;
              const cellSpring = spring({
                frame: Math.max(0, frame - cellDelay - 5),
                fps,
                config: { damping: 20 },
              });
              return (
                <div
                  key={h}
                  style={{
                    width: 52,
                    height: 32,
                    borderRadius: 4,
                    backgroundColor: `rgba(59, 130, 246, ${v * cellSpring})`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 4: Radar drawing ──────────────────────────────────────

function RadarScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = 110;
  const axes = 5;
  const values = [0.8, 0.5, 0.7, 0.6, 0.9];
  const labels = ["Selectivite", "Reactivite", "Engagement", "Regularite", "Timing"];

  const drawProgress = spring({ frame, fps, config: { damping: 15, stiffness: 30 }, durationInFrames: 40 });
  const enterOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [55, 65], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const getPoint = (i: number, v: number) => {
    const angle = (Math.PI * 2 * i) / axes - Math.PI / 2;
    return { x: cx + Math.cos(angle) * r * v, y: cy + Math.sin(angle) * r * v };
  };

  const dataPoints = values.map((v, i) => getPoint(i, v * drawProgress));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
  const rings = [0.33, 0.66, 1.0];

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fc",
        opacity: enterOpacity * exitOpacity,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#334155",
            marginBottom: 24,
            fontFamily: "system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          ADN Dating
        </div>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {rings.map((ring) => {
            const pts = Array.from({ length: axes }, (_, i) => getPoint(i, ring));
            const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
            return <path key={ring} d={path} fill="none" stroke="#e2e8f0" strokeWidth={1} />;
          })}
          {Array.from({ length: axes }, (_, i) => {
            const p = getPoint(i, 1);
            return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth={0.5} />;
          })}
          <path d={dataPath} fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" strokeWidth={2.5} />
          {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#8b5cf6" />
          ))}
          {labels.map((label, i) => {
            const pt = getPoint(i, 1.25);
            return (
              <text
                key={label}
                x={pt.x}
                y={pt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fill="#64748b"
                fontFamily="system-ui, sans-serif"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 5: Tagline finale ─────────────────────────────────────

function TaglineScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 60 } });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fc",
        opacity,
      }}
    >
      <div
        style={{
          textAlign: "center",
          transform: `scale(${scale})`,
          padding: "0 40px",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            lineHeight: 1.15,
            background: "linear-gradient(135deg, #6366f1, #ec4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: "-0.03em",
          }}
        >
          Tes donnees racontent une histoire
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 20,
            fontWeight: 500,
            color: "#94a3b8",
            fontFamily: "system-ui, sans-serif",
            opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          Decouvre-la en 2 minutes
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Main composition ────────────────────────────────────────────

// 30fps, each scene ~65 frames (~2.2s), total ~330 frames (~11s)
const SCENE_DURATION = 65;

export const DatePulseTrailer: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#f8f9fc" }}>
      <Sequence from={0} durationInFrames={SCENE_DURATION}>
        <NumberScene value="12,847" label="swipes analyses" color="#1e293b" />
      </Sequence>
      <Sequence from={SCENE_DURATION} durationInFrames={SCENE_DURATION}>
        <NumberScene value="67%" label="de conversations fantomes" color="#f59e0b" />
      </Sequence>
      <Sequence from={SCENE_DURATION * 2} durationInFrames={SCENE_DURATION + 10}>
        <FunnelScene />
      </Sequence>
      <Sequence from={SCENE_DURATION * 3 + 10} durationInFrames={SCENE_DURATION + 10}>
        <HeatmapScene />
      </Sequence>
      <Sequence from={SCENE_DURATION * 4 + 20} durationInFrames={SCENE_DURATION + 10}>
        <RadarScene />
      </Sequence>
      <Sequence from={SCENE_DURATION * 5 + 30} durationInFrames={90}>
        <TaglineScene />
      </Sequence>
    </AbsoluteFill>
  );
};

// Total duration: 65*5 + 30 + 90 = 445 frames at 30fps = ~14.8s
export const TRAILER_DURATION_FRAMES = 445;
export const TRAILER_FPS = 30;
