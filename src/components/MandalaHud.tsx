import { QualityTier, PeerSummary, MandalaVisualState } from "../engine/core/types";

interface Props {
  summary: PeerSummary | null;
  state: MandalaVisualState | null;
  fps: number;
  tier: QualityTier;
  onPulse: () => void;
  onShare: () => void;
  onTier: (t: QualityTier) => void;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="zen-stat-label">{label}</span>
      <span className="zen-stat-value">{value}</span>
    </div>
  );
}

export default function MandalaHud({ summary, state, fps, tier, onPulse, onShare, onTier }: Props) {
  const mode = state?.mode ?? "DRIFT";

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Panel */}
      <div className="pointer-events-auto absolute left-4 bottom-4 sm:left-6 sm:bottom-6 w-[min(380px,calc(100vw-2rem))] zen-glass rounded-2xl p-5 space-y-3">
        {/* Eyebrow + Mode */}
        <div>
          <div className="zen-eyebrow">THE MIRRORING GLASS</div>
          <div className="zen-mode-title mt-1">{mode.toUpperCase()}</div>
        </div>

        {/* Stats */}
        <div className="space-y-1.5">
          <StatRow label="Peers" value={String(summary?.count ?? 0)} />
          <StatRow label="Energy" value={`${Math.round((summary?.avgEnergy ?? 0) * 100)}%`} />
          <StatRow label="Coherence" value={`${Math.round((summary?.avgCoherence ?? 0) * 100)}%`} />
          <StatRow label="Tension" value={`${Math.round((summary?.avgTension ?? 0) * 100)}%`} />
          <StatRow label="Resonance" value={`${Math.round((summary?.resonance ?? 0) * 100)}%`} />
          <StatRow label="FPS" value={String(Math.round(fps))} />
          <StatRow label="Quality" value={tier.toUpperCase()} />
        </div>

        {/* Help */}
        <p className="text-[0.68rem] leading-relaxed" style={{ color: "hsl(var(--zen-text-dim))", fontFamily: "var(--font-mono)" }}>
          Click / Space = Pulse · S = Share · 1/2/3 = Quality
        </p>

        {/* Buttons */}
        <div className="flex flex-wrap gap-2">
          <button className="zen-pill-btn-accent zen-pill-btn" onClick={onShare}>Share</button>
          <button className="zen-pill-btn" onClick={onPulse}>Pulse</button>
          <button className={`zen-pill-btn ${tier === "high" ? "zen-pill-btn-accent" : ""}`} onClick={() => onTier("high")}>High</button>
          <button className={`zen-pill-btn ${tier === "medium" ? "zen-pill-btn-accent" : ""}`} onClick={() => onTier("medium")}>Med</button>
          <button className={`zen-pill-btn ${tier === "low" ? "zen-pill-btn-accent" : ""}`} onClick={() => onTier("low")}>Low</button>
        </div>
      </div>
    </div>
  );
}
