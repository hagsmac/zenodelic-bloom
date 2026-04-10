import {
  ArcRotateCamera, Color3, Color4, DefaultRenderingPipeline, DynamicTexture,
  Effect, GlowLayer, HemisphericLight, Mesh, MeshBuilder, ParticleSystem,
  Scene, ShaderMaterial, StandardMaterial, TransformNode, Vector3
} from "@babylonjs/core";
import { MandalaVisualState, Peer, PeerSummary, QualityTier } from "../core/types";
import { clamp01 } from "../core/rng";
import mandalaVertex from "../shaders/mandala.vertex.glsl?raw";
import mandalaFragment from "../shaders/mandala.fragment.glsl?raw";

type Orbiter = { mesh: Mesh; material: StandardMaterial; ringIndex: number; baseRadius: number; speed: number; seed: number };

export interface VisualOverrides {
  bloomOverride?: number;    // 0..2
  noiseOverride?: number;    // 0..3
  speedOverride?: number;    // 0.1..3
  petalOverride?: number;    // 3..24
  rainbowFlood: number;      // 0..1
}

export class MandalaExperience {
  private readonly scene: Scene;
  private readonly camera: ArcRotateCamera;
  private readonly root: TransformNode;
  private readonly shader: ShaderMaterial;
  private readonly pipeline: DefaultRenderingPipeline;
  private readonly glow: GlowLayer;
  private readonly plane: Mesh;
  private readonly knot: Mesh;
  private readonly ringInner: Mesh;
  private readonly ringOuter: Mesh;
  private readonly orbiters: Orbiter[] = [];
  private readonly dust: ParticleSystem;
  private readonly dustColor1 = new Color4(1, 1, 1, 1);
  private readonly dustColor2 = new Color4(1, 1, 1, 1);
  private time = 0;
  private pulse = 0;
  private quality: QualityTier = "high";
  private rainbow = 0;
  private rainbowTarget = 0;

  constructor(scene: Scene, initialQuality: QualityTier = "high") {
    this.scene = scene;
    this.scene.clearColor = new Color4(0.02, 0.03, 0.06, 1);

    Effect.ShadersStore["mandalaVertexShader"] = mandalaVertex;
    Effect.ShadersStore["mandalaFragmentShader"] = mandalaFragment;

    this.camera = new ArcRotateCamera("mandalaCam", Math.PI / 2, Math.PI / 2.15, 8.0, Vector3.Zero(), scene);
    this.camera.attachControl(false as unknown as HTMLElement, false);
    this.camera.wheelPrecision = 999999;
    this.camera.lowerRadiusLimit = 8;
    this.camera.upperRadiusLimit = 8;
    scene.activeCamera = this.camera;

    new HemisphericLight("hemi", new Vector3(0, 1, 0), scene).intensity = 0.95;
    this.root = new TransformNode("mandalaRoot", scene);

    this.shader = new ShaderMaterial("mandala", scene, { vertex: "mandala", fragment: "mandala" }, {
      attributes: ["position", "uv"],
      uniforms: ["worldViewProjection", "uTime", "uAspect", "uPetalCount", "uRadiusOuter", "uRadiusInner",
        "uRotation", "uPetalSharpness", "uSymmetryBreak", "uNoiseScale", "uGlitch", "uBloom",
        "uEnergy", "uCoherence", "uTension", "uPulse", "uSeed", "uPrimaryColor", "uSecondaryColor", "uVoidColor",
        "uRainbow", "uSpeed"]
    });
    this.shader.backFaceCulling = false;
    this.shader.disableDepthWrite = true;

    this.plane = MeshBuilder.CreatePlane("mandalaPlane", { size: 6.3, sideOrientation: Mesh.DOUBLESIDE }, scene);
    this.plane.material = this.shader;
    this.plane.isPickable = false;

    this.knot = MeshBuilder.CreateTorusKnot("coreKnot", { radius: 0.42, tube: 0.12, radialSegments: 96, tubularSegments: 32, p: 2, q: 3 }, scene);
    this.knot.position.z = -0.28;
    this.knot.rotation.x = Math.PI / 2;
    this.knot.renderingGroupId = 1;
    this.knot.material = this.makeEmissiveMaterial("knotMat", Color3.FromHexString("#EAF3FF"));

    this.ringInner = MeshBuilder.CreateTorus("ringInner", { diameter: 1.6, thickness: 0.03, tessellation: 96 }, scene);
    this.ringInner.position.z = -0.16;
    this.ringInner.rotation.x = Math.PI / 2;
    this.ringInner.renderingGroupId = 1;
    this.ringInner.material = this.makeEmissiveMaterial("ringInnerMat", Color3.FromHexString("#A7DFFF"));

    this.ringOuter = MeshBuilder.CreateTorus("ringOuter", { diameter: 2.6, thickness: 0.022, tessellation: 96 }, scene);
    this.ringOuter.position.z = -0.22;
    this.ringOuter.rotation.x = Math.PI / 2;
    this.ringOuter.renderingGroupId = 1;
    this.ringOuter.material = this.makeEmissiveMaterial("ringOuterMat", Color3.FromHexString("#FFD9A8"));

    this.glow = new GlowLayer("glow", scene, { blurKernelSize: 64 });
    this.glow.intensity = 0.8;

    this.pipeline = new DefaultRenderingPipeline("pipeline", true, scene, [this.camera]);
    this.pipeline.fxaaEnabled = true;
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = 0.45;
    this.pipeline.bloomWeight = 0.35;
    this.pipeline.bloomKernel = 64;
    this.pipeline.chromaticAberrationEnabled = true;
    this.pipeline.chromaticAberration.aberrationAmount = 8;
    this.pipeline.imageProcessing.vignetteEnabled = true;
    this.pipeline.imageProcessing.vignetteWeight = 1.8;
    this.pipeline.imageProcessingEnabled = true;
    this.pipeline.imageProcessing.contrast = 1.12;
    this.pipeline.imageProcessing.exposure = 1.0;
    this.pipeline.samples = 1;

    this.dust = new ParticleSystem("dust", 1400, scene);
    this.dust.particleTexture = this.createParticleTexture();
    this.dust.emitter = new Vector3(0, 0, -0.18);
    this.dust.minEmitBox = new Vector3(0, 0, 0);
    this.dust.maxEmitBox = new Vector3(0, 0, 0);
    this.dust.direction1 = new Vector3(-0.3, -0.12, -0.18);
    this.dust.direction2 = new Vector3(0.3, 0.8, 0.18);
    this.dust.minEmitPower = 0.12;
    this.dust.maxEmitPower = 0.6;
    this.dust.minLifeTime = 1.8;
    this.dust.maxLifeTime = 4.5;
    this.dust.minSize = 0.012;
    this.dust.maxSize = 0.055;
    this.dust.gravity = new Vector3(0, 0, 0);
    this.dust.blendMode = ParticleSystem.BLENDMODE_ADD;
    this.dust.updateSpeed = 0.013;
    this.dust.color1 = this.dustColor1;
    this.dust.color2 = this.dustColor2;
    this.dust.start();

    this.createOrbiters();
    this.setQuality(initialQuality);
  }

  setQuality(tier: QualityTier): void {
    this.quality = tier;
    if (tier === "high") {
      this.pipeline.samples = 2; this.pipeline.chromaticAberrationEnabled = true;
      this.pipeline.chromaticAberration.aberrationAmount = 8; this.pipeline.imageProcessing.vignetteWeight = 1.8;
      this.pipeline.bloomWeight = 0.35; this.glow.intensity = 0.85; this.dust.emitRate = 150;
    } else if (tier === "medium") {
      this.pipeline.samples = 1; this.pipeline.chromaticAberrationEnabled = true;
      this.pipeline.chromaticAberration.aberrationAmount = 4; this.pipeline.imageProcessing.vignetteWeight = 1.55;
      this.pipeline.bloomWeight = 0.28; this.glow.intensity = 0.6; this.dust.emitRate = 85;
    } else {
      this.pipeline.samples = 1; this.pipeline.chromaticAberrationEnabled = false;
      this.pipeline.imageProcessing.vignetteWeight = 1.2; this.pipeline.bloomWeight = 0.18; this.glow.intensity = 0.35; this.dust.emitRate = 45;
    }
  }

  triggerPulse(): void { this.pulse = 1; }

  triggerRainbowFlood(): void {
    this.rainbowTarget = 1;
    this.pulse = Math.max(this.pulse, 0.7);
  }

  setRainbowLevel(level: number): void {
    this.rainbowTarget = clamp01(level);
  }

  applyState(state: MandalaVisualState, summary: PeerSummary, peers: Peer[], dt: number, overrides?: VisualOverrides): void {
    this.time += dt;
    this.pulse = Math.max(0, this.pulse - dt * 0.9);

    // Rainbow decay / approach
    const rainbowSpeed = this.rainbowTarget > this.rainbow ? 3.5 : 0.6;
    this.rainbow += (this.rainbowTarget - this.rainbow) * dt * rainbowSpeed;
    if (this.rainbowTarget > 0 && this.rainbow > 0.95) {
      this.rainbowTarget = Math.max(0, this.rainbowTarget - dt * 0.15);
    }

    const engine = this.scene.getEngine();
    const aspect = engine.getRenderWidth(true) / Math.max(1, engine.getRenderHeight(true));

    const speed = overrides?.speedOverride ?? 1.0;
    const petalCount = overrides?.petalOverride ?? state.petalCount;
    const noiseScale = overrides?.noiseOverride ?? (0.8 + state.tension * 1.6);
    const bloomVal = overrides?.bloomOverride ?? state.bloom;
    const rainbowVal = Math.max(this.rainbow, overrides?.rainbowFlood ?? 0);

    this.shader.setFloat("uTime", this.time);
    this.shader.setFloat("uAspect", aspect);
    this.shader.setFloat("uPetalCount", petalCount);
    this.shader.setFloat("uRadiusOuter", 1.02 + state.aura * 0.28);
    this.shader.setFloat("uRadiusInner", 0.18 + state.symmetry * 0.19);
    this.shader.setFloat("uRotation", state.rotation * 0.34 + this.time * 0.08 * speed);
    this.shader.setFloat("uPetalSharpness", clamp01(0.18 + state.tension * 0.82));
    this.shader.setFloat("uSymmetryBreak", clamp01(1 - state.symmetry));
    this.shader.setFloat("uNoiseScale", noiseScale);
    this.shader.setFloat("uGlitch", clamp01(state.glitch));
    this.shader.setFloat("uBloom", clamp01(bloomVal));
    this.shader.setFloat("uEnergy", clamp01(state.energy));
    this.shader.setFloat("uCoherence", clamp01(state.coherence));
    this.shader.setFloat("uTension", clamp01(state.tension));
    this.shader.setFloat("uPulse", clamp01(state.pulse + this.pulse));
    this.shader.setFloat("uSeed", state.seed);
    this.shader.setFloat("uRainbow", clamp01(rainbowVal));
    this.shader.setFloat("uSpeed", speed);
    this.shader.setColor3("uPrimaryColor", state.primaryColor);
    this.shader.setColor3("uSecondaryColor", state.secondaryColor);
    this.shader.setColor3("uVoidColor", state.voidColor);

    this.scene.clearColor.r = state.voidColor.r * 0.75;
    this.scene.clearColor.g = state.voidColor.g * 0.75;
    this.scene.clearColor.b = state.voidColor.b * 0.75;
    this.scene.clearColor.a = 1;

    this.knot.position.y = Math.sin(this.time * 0.2) * 0.03;
    this.updateEmissiveMaterial(this.knot.material as StandardMaterial, state.primaryColor, 1.25 + bloomVal * 1.2 + rainbowVal * 0.5);
    this.updateEmissiveMaterial(this.ringInner.material as StandardMaterial, state.secondaryColor, 1.1 + state.aura + rainbowVal * 0.4);
    this.updateEmissiveMaterial(this.ringOuter.material as StandardMaterial, state.primaryColor, 0.8 + state.pulse * 1.3 + rainbowVal * 0.3);
    this.knot.scaling.setAll(1 + state.aura * 0.12 + state.pulse * 0.05 + rainbowVal * 0.08);
    this.ringInner.scaling.setAll(1 + bloomVal * 0.08 + rainbowVal * 0.04);
    this.ringOuter.scaling.setAll(1 + state.energy * 0.05 + state.pulse * 0.05 + rainbowVal * 0.06);

    this.updateOrbiters(state, peers, rainbowVal);
    this.updateDust(state, summary, rainbowVal);
    this.updatePipeline(state, bloomVal, rainbowVal);
  }

  private updatePipeline(state: MandalaVisualState, bloom: number, rainbow: number): void {
    this.pipeline.imageProcessing.exposure = 1.0 + state.energy * 0.16 + rainbow * 0.2;
    this.pipeline.imageProcessing.contrast = 1.08 + state.coherence * 0.12 + rainbow * 0.08;
    this.pipeline.bloomThreshold = 0.42 - state.pulse * 0.04 - rainbow * 0.1;
    this.pipeline.bloomWeight = this.quality === "high" ? 0.3 + bloom * 0.1 + rainbow * 0.15
      : this.quality === "medium" ? 0.24 + bloom * 0.08 + rainbow * 0.1 : 0.16 + bloom * 0.05 + rainbow * 0.06;
    this.pipeline.imageProcessing.vignetteWeight = 1.25 + state.tension * 0.5 - rainbow * 0.3;
    if (this.pipeline.chromaticAberrationEnabled) {
      this.pipeline.chromaticAberration.aberrationAmount = (this.quality === "high" ? 5 + state.tension * 8 : 3 + state.tension * 4) + rainbow * 6;
    }
  }

  private updateDust(state: MandalaVisualState, summary: PeerSummary, rainbow: number): void {
    this.dust.emitRate = (this.quality === "high" ? 120 : this.quality === "medium" ? 70 : 35)
      + state.energy * 170 + state.pulse * 120 + rainbow * 200;
    this.dustColor1.r = state.primaryColor.r; this.dustColor1.g = state.primaryColor.g; this.dustColor1.b = state.primaryColor.b; this.dustColor1.a = 0.92;
    this.dustColor2.r = state.secondaryColor.r; this.dustColor2.g = state.secondaryColor.g; this.dustColor2.b = state.secondaryColor.b; this.dustColor2.a = 0.78;

    // Rainbow tints dust
    if (rainbow > 0.1) {
      const hue = (this.time * 0.3) % 1;
      this.dustColor1.r += rainbow * Math.sin(hue * 6.28) * 0.5;
      this.dustColor1.g += rainbow * Math.sin((hue + 0.33) * 6.28) * 0.5;
      this.dustColor1.b += rainbow * Math.sin((hue + 0.66) * 6.28) * 0.5;
    }

    this.dust.minSize = 0.012 + state.energy * 0.006 + rainbow * 0.008;
    this.dust.maxSize = 0.05 + state.pulse * 0.02 + summary.resonance * 0.01 + rainbow * 0.015;
  }

  private updateOrbiters(state: MandalaVisualState, peers: Peer[], rainbow: number): void {
    for (let i = 0; i < this.orbiters.length; i++) {
      const orb = this.orbiters[i];
      const peer = peers[i % peers.length];
      const angle = peer.phase * Math.PI * 2 + this.time * orb.speed + orb.seed;
      const radius = orb.baseRadius + state.aura * 0.16 + peer.energy * 0.12 + state.pulse * 0.06 * (1 + orb.ringIndex * 0.2);
      orb.mesh.position.x = Math.cos(angle) * radius;
      orb.mesh.position.y = Math.sin(angle) * radius;
      orb.mesh.position.z = -0.34 + Math.sin(angle * 1.6 + peer.hue * 4) * 0.14;
      const scale = 0.04 + peer.energy * 0.07 + state.pulse * 0.03 + rainbow * 0.02;
      orb.mesh.scaling.setAll(scale);
      const mix = clamp01(peer.coherence * 0.8 + peer.hue * 0.2);
      const boost = 0.9 + peer.energy * 1.6 + state.bloom * 0.7 + rainbow * 0.8;
      orb.material.emissiveColor.r = (state.primaryColor.r + (state.secondaryColor.r - state.primaryColor.r) * mix) * boost;
      orb.material.emissiveColor.g = (state.primaryColor.g + (state.secondaryColor.g - state.primaryColor.g) * mix) * boost;
      orb.material.emissiveColor.b = (state.primaryColor.b + (state.secondaryColor.b - state.primaryColor.b) * mix) * boost;

      // Rainbow tint per orbiter
      if (rainbow > 0.1) {
        const hue = (i / this.orbiters.length + this.time * 0.15) % 1;
        orb.material.emissiveColor.r += rainbow * 0.4 * Math.max(0, Math.sin(hue * 6.28));
        orb.material.emissiveColor.g += rainbow * 0.4 * Math.max(0, Math.sin((hue + 0.33) * 6.28));
        orb.material.emissiveColor.b += rainbow * 0.4 * Math.max(0, Math.sin((hue + 0.66) * 6.28));
      }

      orb.material.alpha = 0.35 + peer.coherence * 0.55 + rainbow * 0.1;
    }
  }

  private createOrbiters(): void {
    const counts = [8, 12, 16];
    const radii = [1.15, 1.9, 2.85];
    let index = 0;
    for (let ring = 0; ring < counts.length; ring++) {
      for (let i = 0; i < counts[ring]; i++) {
        const mesh = MeshBuilder.CreateIcoSphere(`orbiter-${index}`, { radius: 0.06, subdivisions: 2 }, this.scene);
        mesh.parent = this.root;
        mesh.renderingGroupId = 1;
        const material = this.makeEmissiveMaterial(`orbMat-${index}`, Color3.FromHexString("#FFFFFF"));
        material.alpha = 0.7;
        mesh.material = material;
        this.orbiters.push({ mesh, material, ringIndex: ring, baseRadius: radii[ring], speed: 0.2 + ring * 0.1 + i * 0.01, seed: (i / counts[ring]) * Math.PI * 2 + ring * 0.33 });
        index++;
      }
    }
  }

  private createParticleTexture(): DynamicTexture {
    const texture = new DynamicTexture("softParticle", { width: 64, height: 64 }, this.scene, false);
    const ctx = texture.getContext();
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1.0)");
      grad.addColorStop(0.25, "rgba(255,255,255,0.9)");
      grad.addColorStop(1, "rgba(255,255,255,0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      texture.update();
    }
    return texture;
  }

  private makeEmissiveMaterial(name: string, color: Color3): StandardMaterial {
    const mat = new StandardMaterial(name, this.scene);
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.emissiveColor = color.clone();
    mat.disableLighting = true;
    return mat;
  }

  private updateEmissiveMaterial(mat: StandardMaterial, color: Color3, intensity: number): void {
    mat.emissiveColor.r = color.r * intensity;
    mat.emissiveColor.g = color.g * intensity;
    mat.emissiveColor.b = color.b * intensity;
  }
}
