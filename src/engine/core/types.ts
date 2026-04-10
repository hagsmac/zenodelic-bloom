import { Color3 } from "@babylonjs/core";

export type QualityTier = "high" | "medium" | "low";

export interface Peer {
  id: string;
  clusterId: number;
  energy: number;
  coherence: number;
  tension: number;
  phase: number;
  latency: number;
  hue: number;
  alive: boolean;
}

export interface PeerSummary {
  count: number;
  activeCount: number;
  avgEnergy: number;
  avgCoherence: number;
  avgTension: number;
  phaseVariance: number;
  latencyJitter: number;
  resonance: number;
  dominantCluster: number;
}

export interface MandalaVisualState {
  petalCount: number;
  rotation: number;
  bloom: number;
  symmetry: number;
  aura: number;
  glitch: number;
  pulse: number;
  energy: number;
  coherence: number;
  tension: number;
  seed: number;
  mode: string;
  primaryColor: Color3;
  secondaryColor: Color3;
  voidColor: Color3;
}
