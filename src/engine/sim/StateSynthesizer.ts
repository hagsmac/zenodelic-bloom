import { Color3 } from "@babylonjs/core";
import { PALETTES, blendColors } from "../core/palette";
import { clamp01, lerp } from "../core/rng";
import { MandalaVisualState, PeerSummary } from "../core/types";

function defaultState(): MandalaVisualState {
  return {
    petalCount: 8, rotation: 0, bloom: 0.35, symmetry: 0.75, aura: 0.42,
    glitch: 0.08, pulse: 0, energy: 0.35, coherence: 0.55, tension: 0.2,
    seed: 1337, mode: "Drift",
    primaryColor: PALETTES.abyss.primary.clone(),
    secondaryColor: PALETTES.abyss.secondary.clone(),
    voidColor: PALETTES.abyss.void.clone()
  };
}

export class StateSynthesizer {
  private readonly current = defaultState();
  private clock = 0;

  update(summary: PeerSummary, dt: number): MandalaVisualState {
    this.clock += dt;
    const moodOrbit = 0.5 + 0.5 * Math.sin(this.clock * 0.11 + summary.phaseVariance * 8.0);
    const basePalette = summary.avgTension > 0.62 ? PALETTES.ember
      : summary.avgCoherence > 0.68 ? PALETTES.aurora
      : summary.avgEnergy > 0.68 ? PALETTES.solar : PALETTES.abyss;
    const accentPalette = summary.resonance > 0.76 ? PALETTES.obsidian : PALETTES.aurora;
    const blend = clamp01(summary.resonance * 0.45 + moodOrbit * 0.35 + summary.avgEnergy * 0.2);
    const targetPrimary = blendColors(basePalette.primary, accentPalette.primary, blend);
    const targetSecondary = blendColors(basePalette.secondary, accentPalette.secondary, blend * 0.8);
    const targetVoid = blendColors(basePalette.void, accentPalette.void, blend * 0.35);

    const targetPetals = 5 + summary.avgCoherence * 11 + summary.resonance * 6 + summary.avgEnergy * 2.2;
    const targetRotation = (summary.avgTension * 2 - 1) * (0.9 + summary.avgEnergy * 2.0);
    const targetBloom = clamp01(0.2 + summary.avgEnergy * 0.42 + summary.resonance * 0.62 + summary.avgCoherence * 0.16);
    const targetSymmetry = clamp01(0.22 + summary.avgCoherence * 0.78 - summary.avgTension * 0.38);
    const targetAura = clamp01(0.22 + summary.avgEnergy * 0.56 + summary.resonance * 0.34);
    const targetGlitch = clamp01(summary.avgTension * 0.72 + summary.latencyJitter / 180 + (1 - summary.avgCoherence) * 0.12);
    const targetPulse = clamp01(summary.resonance * 1.15 + (summary.activeCount / Math.max(1, summary.count)) * 0.22);

    const mode = summary.resonance > 0.82 ? "Confluence"
      : summary.avgTension > 0.68 ? "Fracture"
      : summary.avgCoherence > 0.72 ? "Alignment"
      : summary.avgEnergy > 0.66 ? "Radiance" : "Drift";

    const t = 1 - Math.exp(-dt * 4.2);
    this.current.petalCount = lerp(this.current.petalCount, targetPetals, t);
    this.current.rotation = lerp(this.current.rotation, targetRotation, t);
    this.current.bloom = lerp(this.current.bloom, targetBloom, t);
    this.current.symmetry = lerp(this.current.symmetry, targetSymmetry, t);
    this.current.aura = lerp(this.current.aura, targetAura, t);
    this.current.glitch = lerp(this.current.glitch, targetGlitch, t);
    this.current.pulse = lerp(this.current.pulse, targetPulse, t);
    this.current.energy = lerp(this.current.energy, clamp01(summary.avgEnergy), t);
    this.current.coherence = lerp(this.current.coherence, clamp01(summary.avgCoherence), t);
    this.current.tension = lerp(this.current.tension, clamp01(summary.avgTension), t);
    this.current.seed = Math.floor(summary.dominantCluster * 977 + summary.phaseVariance * 1000 + this.clock * 31);
    this.current.mode = mode;

    this.current.primaryColor.r = lerp(this.current.primaryColor.r, targetPrimary.r, t);
    this.current.primaryColor.g = lerp(this.current.primaryColor.g, targetPrimary.g, t);
    this.current.primaryColor.b = lerp(this.current.primaryColor.b, targetPrimary.b, t);
    this.current.secondaryColor.r = lerp(this.current.secondaryColor.r, targetSecondary.r, t);
    this.current.secondaryColor.g = lerp(this.current.secondaryColor.g, targetSecondary.g, t);
    this.current.secondaryColor.b = lerp(this.current.secondaryColor.b, targetSecondary.b, t);
    this.current.voidColor.r = lerp(this.current.voidColor.r, targetVoid.r, t * 0.7);
    this.current.voidColor.g = lerp(this.current.voidColor.g, targetVoid.g, t * 0.7);
    this.current.voidColor.b = lerp(this.current.voidColor.b, targetVoid.b, t * 0.7);

    return this.current;
  }
}
