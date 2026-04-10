import { Engine } from "@babylonjs/core";
import { QualityTier } from "../core/types";
import { MandalaExperience } from "./MandalaExperience";

export class QualityManager {
  tier: QualityTier;
  constructor(private readonly engine: Engine, private readonly experience: MandalaExperience, initial: QualityTier = "high") {
    this.tier = initial;
    this.setTier(initial);
  }
  setTier(tier: QualityTier): void {
    this.tier = tier;
    if (tier === "high") this.engine.setHardwareScalingLevel(1.0);
    else if (tier === "medium") this.engine.setHardwareScalingLevel(1.2);
    else this.engine.setHardwareScalingLevel(1.45);
    this.experience.setQuality(tier);
  }
}
