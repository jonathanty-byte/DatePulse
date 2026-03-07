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

// ── Scene 2: Survival curve ─────────────────────────────────────

function SurvivalScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const data = [100, 58, 34, 22, 18, 15, 13, 12];
  const w = 520;
  const h = 240;
  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const drawProgress = spring({ frame, fps, config: { damping: 15, stiffness: 30 }, durationInFrames: 40 });
  const enterOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [55, 65], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Red zone flash (messages 1-3)
  const flashOpacity = interpolate(frame, [20, 28, 36, 40], [0, 0.3, 0.15, 0.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const toX = (i: number) => pad.left + (i / (data.length - 1)) * plotW;
  const toY = (v: number) => pad.top + (1 - v / 100) * plotH;

  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v * drawProgress)}`).join(" ");
  const areaPath = linePath + ` L${toX(data.length - 1)},${toY(0)} L${toX(0)},${toY(0)} Z`;

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
            marginBottom: 20,
            fontFamily: "system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Courbe de survie
        </div>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          {/* Red danger zone (messages 1-3) */}
          <rect
            x={toX(0)}
            y={pad.top}
            width={toX(2) - toX(0)}
            height={plotH}
            fill={`rgba(239, 68, 68, ${flashOpacity})`}
          />
          {/* Area fill */}
          <path d={areaPath} fill="rgba(239, 68, 68, 0.12)" />
          {/* Line */}
          <path d={linePath} fill="none" stroke="#ef4444" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {/* Dots */}
          {data.map((v, i) => (
            <circle
              key={i}
              cx={toX(i)}
              cy={toY(v * drawProgress)}
              r={i < 3 ? 5 : 3.5}
              fill={i < 3 ? "#ef4444" : "#94a3b8"}
              opacity={drawProgress}
            />
          ))}
          {/* X axis labels */}
          {data.map((_, i) => (
            <text
              key={i}
              x={toX(i)}
              y={h - 6}
              textAnchor="middle"
              fontSize={11}
              fill="#94a3b8"
              fontFamily="system-ui, sans-serif"
            >
              msg {i + 1}
            </text>
          ))}
          {/* Y axis labels */}
          {[0, 25, 50, 75, 100].map((v) => (
            <text
              key={v}
              x={pad.left - 8}
              y={toY(v) + 4}
              textAnchor="end"
              fontSize={10}
              fill="#94a3b8"
              fontFamily="system-ui, sans-serif"
            >
              {v}%
            </text>
          ))}
        </svg>
        <div
          style={{
            marginTop: 10,
            fontSize: 14,
            fontWeight: 600,
            color: "#ef4444",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          66% perdus avant le 3e message
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: Personalized recommendations ───────────────────────

function RecommendationScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const recos = [
    { problem: "Openers trop courts (32 car.)", action: "Vise 60+ caracteres", icon: "✏️" },
    { problem: "Reponse trop rapide (4 min)", action: "Attends 15-30 min", icon: "⏱️" },
    { problem: "Escalation tardive (msg #18)", action: "Propose un date au msg 8-12", icon: "📍" },
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
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#334155",
            marginBottom: 28,
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Recommandations
        </div>
        {recos.map((reco, i) => {
          const slideIn = spring({
            frame: Math.max(0, frame - i * 10 - 5),
            fps,
            config: { damping: 14, stiffness: 60 },
          });
          const x = interpolate(slideIn, [0, 1], [60, 0]);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 16,
                padding: "14px 18px",
                borderRadius: 12,
                backgroundColor: "white",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                border: "1px solid #e2e8f0",
                opacity: slideIn,
                transform: `translateX(${x}px)`,
              }}
            >
              <span style={{ fontSize: 24 }}>{reco.icon}</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#334155",
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {reco.problem}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#10b981",
                    marginTop: 2,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  → {reco.action}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 4: Radar drawing ──────────────────────────────────────

function RadarScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const size = 360;
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
        <SurvivalScene />
      </Sequence>
      <Sequence from={SCENE_DURATION * 3 + 10} durationInFrames={SCENE_DURATION + 10}>
        <RecommendationScene />
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
