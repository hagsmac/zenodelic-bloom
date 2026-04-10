import { Peer, PeerSummary } from "../core/types";
import { RNG, clamp01, circularDelta, lerp, fract } from "../core/rng";

type ClusterState = { phase: number; drift: number; mood: number };

export class PeerField {
  readonly peers: Peer[] = [];
  private readonly clusters: ClusterState[] = [];
  private readonly rng: RNG;
  private time = 0;
  private pulse = 0;
  private pulseCluster = -1;
  private nextEventAt = 0;

  constructor(peerCount = 48, seed = 1337, clusterCount = 4) {
    this.rng = new RNG(seed);
    for (let c = 0; c < clusterCount; c++) {
      this.clusters.push({ phase: this.rng.next(), drift: this.rng.range(-0.02, 0.02), mood: this.rng.range(0.25, 0.75) });
    }
    for (let i = 0; i < peerCount; i++) {
      const clusterId = i % clusterCount;
      this.peers.push({
        id: `peer-${i}`, clusterId,
        energy: this.rng.range(0.25, 0.75), coherence: this.rng.range(0.25, 0.75),
        tension: this.rng.range(0.1, 0.55), phase: this.rng.next(),
        latency: this.rng.range(18, 130), hue: this.rng.next(), alive: true
      });
    }
    this.nextEventAt = this.rng.range(3.5, 8.5);
  }

  triggerResonance(clusterId = -1): void {
    this.pulse = 1;
    this.pulseCluster = clusterId >= 0 ? clusterId : this.rng.int(0, this.clusters.length);
    this.nextEventAt = this.time + this.rng.range(5.5, 11.5);
    const cluster = this.clusters[this.pulseCluster];
    cluster.mood = clamp01(cluster.mood + 0.2);
    cluster.drift *= 0.92;
  }

  update(dt: number): void {
    this.time += dt;
    this.pulse = Math.max(0, this.pulse - dt * 0.7);
    for (let c = 0; c < this.clusters.length; c++) {
      const cluster = this.clusters[c];
      cluster.phase = fract(cluster.phase + cluster.drift * dt);
      cluster.mood = clamp01(cluster.mood + Math.sin(this.time * 0.11 + c * 1.7) * 0.0009 - (cluster.mood - 0.52) * 0.0005);
    }
    if (this.time >= this.nextEventAt) this.triggerResonance();
    for (const peer of this.peers) {
      const cluster = this.clusters[peer.clusterId];
      const phaseDelta = circularDelta(peer.phase, cluster.phase);
      const pulseBoost = this.pulseCluster === peer.clusterId ? this.pulse : 0;
      const targetEnergy = clamp01(0.33 + cluster.mood * 0.42 + pulseBoost * 0.28 + Math.sin(this.time * 0.35 + peer.hue * 8.0) * 0.06);
      const targetCoherence = clamp01(1.0 - phaseDelta * 1.35 + cluster.mood * 0.08 + pulseBoost * 0.18);
      const targetTension = clamp01(0.14 + phaseDelta * 0.9 + (1.0 - cluster.mood) * 0.18 + Math.abs(cluster.drift) * 2.2 + pulseBoost * 0.45);
      peer.energy = lerp(peer.energy, targetEnergy, dt * 1.8);
      peer.coherence = lerp(peer.coherence, targetCoherence, dt * 1.6);
      peer.tension = lerp(peer.tension, targetTension, dt * 1.7);
      peer.phase = fract(peer.phase + dt * (0.075 + peer.energy * 0.18 + cluster.drift * 0.5));
      peer.latency = 24 + peer.tension * 170 + Math.abs(Math.sin(this.time * 1.7 + peer.hue * 10.0)) * 16;
      peer.hue = fract(peer.hue + dt * (0.01 + cluster.drift * 0.05));
      peer.alive = true;
    }
  }

  getSummary(): PeerSummary {
    let sumEnergy = 0, sumCoherence = 0, sumTension = 0, sumPhase = 0, sumPhaseSq = 0, sumLatency = 0, sumLatencySq = 0, activeCount = 0;
    const clusterEnergy = new Array(this.clusters.length).fill(0);
    const clusterCount = new Array(this.clusters.length).fill(0);
    for (const peer of this.peers) {
      sumEnergy += peer.energy; sumCoherence += peer.coherence; sumTension += peer.tension;
      sumPhase += peer.phase; sumPhaseSq += peer.phase * peer.phase;
      sumLatency += peer.latency; sumLatencySq += peer.latency * peer.latency;
      clusterEnergy[peer.clusterId] += peer.energy; clusterCount[peer.clusterId]++;
      if (peer.energy > 0.62) activeCount++;
    }
    const count = this.peers.length;
    const avgEnergy = sumEnergy / count, avgCoherence = sumCoherence / count, avgTension = sumTension / count;
    const phaseMean = sumPhase / count;
    const phaseVariance = Math.max(0, sumPhaseSq / count - phaseMean * phaseMean);
    const latencyMean = sumLatency / count;
    const latencyJitter = Math.max(0, sumLatencySq / count - latencyMean * latencyMean);
    let dominantCluster = 0, bestEnergy = -Infinity;
    for (let i = 0; i < clusterEnergy.length; i++) {
      const avg = clusterEnergy[i] / Math.max(1, clusterCount[i]);
      if (avg > bestEnergy) { bestEnergy = avg; dominantCluster = i; }
    }
    const resonance = clamp01(avgEnergy * 0.45 + avgCoherence * 0.35 + (1.0 - avgTension) * 0.2 + this.pulse * 0.3);
    return { count, activeCount, avgEnergy, avgCoherence, avgTension, phaseVariance, latencyJitter, resonance, dominantCluster };
  }
}
