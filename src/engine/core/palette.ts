import { Color3 } from "@babylonjs/core";
import { clamp01 } from "./rng";

export interface Palette {
  name: string;
  primary: Color3;
  secondary: Color3;
  void: Color3;
  accent: Color3;
}

export const PALETTES = {
  abyss: {
    name: "Abyss",
    primary: Color3.FromHexString("#7B8CFF"),
    secondary: Color3.FromHexString("#63F3D7"),
    void: Color3.FromHexString("#050814"),
    accent: Color3.FromHexString("#D9F8FF")
  },
  ember: {
    name: "Ember",
    primary: Color3.FromHexString("#FF4D6D"),
    secondary: Color3.FromHexString("#FFB86B"),
    void: Color3.FromHexString("#0B0610"),
    accent: Color3.FromHexString("#FFE3C0")
  },
  aurora: {
    name: "Aurora",
    primary: Color3.FromHexString("#8CFFD8"),
    secondary: Color3.FromHexString("#B39DFF"),
    void: Color3.FromHexString("#040A14"),
    accent: Color3.FromHexString("#EFFBFF")
  },
  solar: {
    name: "Solar",
    primary: Color3.FromHexString("#FFD166"),
    secondary: Color3.FromHexString("#FF7A59"),
    void: Color3.FromHexString("#0A0810"),
    accent: Color3.FromHexString("#FFF4CF")
  },
  obsidian: {
    name: "Obsidian",
    primary: Color3.FromHexString("#9A7CFF"),
    secondary: Color3.FromHexString("#5EEAD4"),
    void: Color3.FromHexString("#030306"),
    accent: Color3.FromHexString("#D7C7FF")
  }
} satisfies Record<string, Palette>;

export function blendColors(a: Color3, b: Color3, t: number): Color3 {
  const k = clamp01(t);
  return new Color3(a.r + (b.r - a.r) * k, a.g + (b.g - a.g) * k, a.b + (b.b - a.b) * k);
}
