import { useRef, useEffect, useState, useCallback } from "react";
import { Engine, Scene } from "@babylonjs/core";
import { QualityTier, PeerSummary, MandalaVisualState } from "../engine/core/types";
import { PeerField } from "../engine/sim/PeerField";
import { StateSynthesizer } from "../engine/sim/StateSynthesizer";
import { MandalaExperience, VisualOverrides } from "../engine/visuals/MandalaExperience";
import { QualityManager } from "../engine/visuals/QualityManager";
import { shareOrDownloadCanvas } from "../engine/visuals/ScreenshotService";
import MandalaHud from "./MandalaHud";

function getInitialTier(): QualityTier {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "low";
  const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
  return isMobile ? "medium" : "high";
}

export default function MandalaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<{
    engine: Engine; peerField: PeerField; synthesizer: StateSynthesizer;
    experience: MandalaExperience; quality: QualityManager;
    overrides: VisualOverrides;
  } | null>(null);

  const [summary, setSummary] = useState<PeerSummary | null>(null);
  const [state, setState] = useState<MandalaVisualState | null>(null);
  const [fps, setFps] = useState(0);
  const [tier, setTier] = useState<QualityTier>(getInitialTier());
  const [overrides, setOverrides] = useState<VisualOverrides>({ rainbowFlood: 0 });
  const [isRainbowActive, setIsRainbowActive] = useState(false);

  const handlePulse = useCallback(() => {
    const ref = engineRef.current;
    if (!ref) return;
    ref.peerField.triggerResonance(ref.peerField.getSummary().dominantCluster);
    ref.experience.triggerPulse();
  }, []);

  const handleRainbow = useCallback(() => {
    const ref = engineRef.current;
    if (!ref) return;
    ref.experience.triggerRainbowFlood();
    ref.peerField.triggerResonance();
    setIsRainbowActive(true);
    setTimeout(() => setIsRainbowActive(false), 4000);
  }, []);

  const handleShare = useCallback(async () => {
    const ref = engineRef.current;
    if (!ref) return;
    const canvas = ref.engine.getRenderingCanvas();
    if (canvas) await shareOrDownloadCanvas(canvas, "mirroring-glass");
  }, []);

  const handleTier = useCallback((t: QualityTier) => {
    const ref = engineRef.current;
    if (!ref) return;
    ref.quality.setTier(t);
    setTier(t);
  }, []);

  const handleOverrideChange = useCallback((key: keyof VisualOverrides, value: number | undefined) => {
    setOverrides(prev => {
      const next = { ...prev, [key]: value };
      if (engineRef.current) engineRef.current.overrides = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    const scene = new Scene(engine);
    const initialTier = getInitialTier();
    const peerField = new PeerField(48, 1337, 4);
    const synthesizer = new StateSynthesizer();
    const experience = new MandalaExperience(scene, initialTier);
    const quality = new QualityManager(engine, experience, initialTier);
    const initOverrides: VisualOverrides = { rainbowFlood: 0 };

    engineRef.current = { engine, peerField, synthesizer, experience, quality, overrides: initOverrides };

    let last = performance.now();
    let frameCount = 0;

    engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      peerField.update(dt);
      const s = peerField.getSummary();
      const vs = synthesizer.update(s, dt);
      experience.applyState(vs, s, peerField.peers, dt, engineRef.current?.overrides);
      scene.render();

      frameCount++;
      if (frameCount % 10 === 0) {
        setSummary({ ...s });
        setState({ ...vs, primaryColor: vs.primaryColor.clone(), secondaryColor: vs.secondaryColor.clone(), voidColor: vs.voidColor.clone() });
        setFps(engine.getFps());
      }
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === " ") { e.preventDefault(); handlePulse(); }
      else if (key === "s") handleShare();
      else if (key === "1") handleTier("high");
      else if (key === "2") handleTier("medium");
      else if (key === "3") handleTier("low");
      else if (key === "p") handlePulse();
      else if (key === "r") handleRainbow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePulse, handleShare, handleTier, handleRainbow]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      <canvas
        ref={canvasRef}
        className="block w-full h-full touch-none"
        onPointerDown={handlePulse}
      />
      <MandalaHud
        summary={summary}
        state={state}
        fps={fps}
        tier={tier}
        overrides={overrides}
        isRainbowActive={isRainbowActive}
        onPulse={handlePulse}
        onShare={handleShare}
        onTier={handleTier}
        onRainbow={handleRainbow}
        onOverrideChange={handleOverrideChange}
      />
    </div>
  );
}
