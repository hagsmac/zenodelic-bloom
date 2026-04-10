import { useState } from "react";
import { QualityTier, PeerSummary, MandalaVisualState } from "../engine/core/types";
import { VisualOverrides } from "../engine/visuals/MandalaExperience";

interface Props {
  summary: PeerSummary | null;
  state: MandalaVisualState | null;
  fps: number;
  tier: QualityTier;
  overrides: VisualOverrides;
  isRainbowActive: boolean;
  onPulse: () => void;
  onShare: () => void;
  onTier: (t: QualityTier) => void;
  onRainbow: () => void;
  onOverrideChange: (key: keyof VisualOverrides, value: number | undefined) => void;
}

function StatRow({ label, value, glow }: { label: string; value: string; glow?: boolean }) {
  return (
    <div className="flex justify-between items-center group">
      <span className="zen-stat-label">{label}</span>
      <span className={`zen-stat-value ${glow ? "zen-glow-text" : ""}`}>{value}</span>
    </div>
  );
}

function ZenSlider({ label, value, min, max, step, onChange, unit }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; unit?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="zen-stat-label">{label}</span>
        <span className="zen-stat-value">{value.toFixed(step < 1 ? 1 : 0)}{unit ?? ""}</span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "hsla(var(--zen-surface-elevated), 0.8)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-75"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, hsl(var(--zen-glow-primary)), hsl(var(--zen-glow-secondary)))`,
            boxShadow: `0 0 8px hsla(var(--zen-glow-primary), 0.4)`
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="zen-range-input"
      />
    </div>
  );
}

export default function MandalaHud({
  summary, state, fps, tier, overrides, isRainbowActive,
  onPulse, onShare, onTier, onRainbow, onOverrideChange
}: Props) {
  const mode = state?.mode ?? "DRIFT";
  const [labOpen, setLabOpen] = useState(false);

  const bloom = overrides.bloomOverride ?? state?.bloom ?? 0.35;
  const noise = overrides.noiseOverride ?? 1.5;
  const speed = overrides.speedOverride ?? 1.0;
  const petals = overrides.petalOverride ?? state?.petalCount ?? 8;

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Title watermark top-right */}
      <div className="absolute top-5 right-6 text-right select-none">
        <div className="zen-eyebrow opacity-40">THE MIRRORING GLASS</div>
      </div>

      {/* Main Panel */}
      <div className="pointer-events-auto absolute left-3 bottom-3 sm:left-5 sm:bottom-5 w-[min(400px,calc(100vw-1.5rem))] zen-glass rounded-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="zen-eyebrow">SYNTHETIC NETWORK</div>
              <div className="zen-mode-title mt-0.5">{mode.toUpperCase()}</div>
            </div>
            {/* Rainbow indicator */}
            {isRainbowActive && (
              <div className="zen-rainbow-badge animate-scale-in">
                ✦ FLOOD
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px" style={{ background: "linear-gradient(90deg, transparent, hsla(var(--zen-glow-primary), 0.2), hsla(var(--zen-glow-secondary), 0.2), transparent)" }} />

        {/* Stats Grid */}
        <div className="px-5 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
          <StatRow label="Peers" value={String(summary?.count ?? 0)} />
          <StatRow label="FPS" value={String(Math.round(fps))} />
          <StatRow label="Energy" value={`${Math.round((summary?.avgEnergy ?? 0) * 100)}%`} glow />
          <StatRow label="Coherence" value={`${Math.round((summary?.avgCoherence ?? 0) * 100)}%`} />
          <StatRow label="Tension" value={`${Math.round((summary?.avgTension ?? 0) * 100)}%`} />
          <StatRow label="Resonance" value={`${Math.round((summary?.resonance ?? 0) * 100)}%`} glow />
        </div>

        {/* Divider */}
        <div className="mx-5 h-px" style={{ background: "linear-gradient(90deg, transparent, hsla(var(--zen-glass-border), 0.3), transparent)" }} />

        {/* Action Buttons */}
        <div className="px-5 py-3 flex flex-wrap gap-2">
          <button className="zen-pill-btn zen-pill-btn-rainbow" onClick={onRainbow}>
            🌈 Rainbow Flood
          </button>
          <button className="zen-pill-btn" onClick={onPulse}>⚡ Pulse</button>
          <button className="zen-pill-btn zen-pill-btn-accent" onClick={onShare}>↗ Share</button>
        </div>

        {/* Quality row */}
        <div className="px-5 pb-2 flex items-center gap-2">
          <span className="zen-stat-label mr-auto">Quality</span>
          {(["high", "medium", "low"] as QualityTier[]).map(t => (
            <button
              key={t}
              className={`zen-pill-btn-sm ${tier === t ? "zen-pill-btn-sm-active" : ""}`}
              onClick={() => onTier(t)}
            >
              {t === "medium" ? "MED" : t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Lab toggle */}
        <div className="mx-5 h-px" style={{ background: "linear-gradient(90deg, transparent, hsla(var(--zen-glass-border), 0.3), transparent)" }} />
        <button
          className="w-full px-5 py-2.5 flex items-center justify-between zen-eyebrow hover:opacity-80 transition-opacity"
          onClick={() => setLabOpen(!labOpen)}
        >
          <span>✧ VISUAL LAB</span>
          <span className="text-sm" style={{ transform: labOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s ease" }}>▾</span>
        </button>

        {/* Lab Panel - Sliders */}
        {labOpen && (
          <div className="px-5 pb-4 space-y-3 animate-fade-in">
            <ZenSlider
              label="Bloom"
              value={bloom}
              min={0}
              max={2}
              step={0.05}
              onChange={v => onOverrideChange("bloomOverride", v)}
            />
            <ZenSlider
              label="Noise"
              value={noise}
              min={0}
              max={3}
              step={0.1}
              onChange={v => onOverrideChange("noiseOverride", v)}
            />
            <ZenSlider
              label="Speed"
              value={speed}
              min={0.1}
              max={3}
              step={0.1}
              unit="×"
              onChange={v => onOverrideChange("speedOverride", v)}
            />
            <ZenSlider
              label="Petals"
              value={petals}
              min={3}
              max={24}
              step={1}
              onChange={v => onOverrideChange("petalOverride", v)}
            />
            <ZenSlider
              label="Rainbow"
              value={overrides.rainbowFlood}
              min={0}
              max={1}
              step={0.05}
              onChange={v => onOverrideChange("rainbowFlood", v)}
            />
            <button
              className="zen-pill-btn-sm w-full mt-1"
              onClick={() => {
                onOverrideChange("bloomOverride", undefined);
                onOverrideChange("noiseOverride", undefined);
                onOverrideChange("speedOverride", undefined);
                onOverrideChange("petalOverride", undefined);
                onOverrideChange("rainbowFlood", 0);
              }}
            >
              ↺ Reset to Auto
            </button>
          </div>
        )}

        {/* Help */}
        <div className="px-5 pb-3">
          <p className="zen-help-text">
            Space/Click = Pulse · R = Rainbow · S = Share · 1/2/3 = Quality
          </p>
        </div>
      </div>
    </div>
  );
}
