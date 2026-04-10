precision highp float;

varying vec2 vUV;

uniform float uTime;
uniform float uAspect;
uniform float uPetalCount;
uniform float uRadiusOuter;
uniform float uRadiusInner;
uniform float uRotation;
uniform float uPetalSharpness;
uniform float uSymmetryBreak;
uniform float uNoiseScale;
uniform float uGlitch;
uniform float uBloom;
uniform float uEnergy;
uniform float uCoherence;
uniform float uTension;
uniform float uPulse;
uniform float uSeed;

uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform vec3 uVoidColor;

float hash12(vec2 p) {
  float h = dot(p, vec2(127.1, 311.7)) + uSeed * 17.0;
  return fract(sin(h) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec2 rot(vec2 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

void main(void) {
  vec2 p = vUV * 2.0 - 1.0;
  p.x *= uAspect;
  float timeWarp = uTime * (0.08 + uEnergy * 0.08) + uRotation;
  p = rot(p, timeWarp);
  float warpA = noise(p * (2.0 + uNoiseScale * 1.7) + uTime * 0.17);
  float warpB = noise(p.yx * (3.0 + uNoiseScale * 1.2) - uTime * 0.13);
  p += vec2(warpA - 0.5, warpB - 0.5) * (0.04 + uSymmetryBreak * 0.08);
  if (uGlitch > 0.01) {
    float band = floor((vUV.y + uTime * 0.03) * 28.0);
    float g = hash12(vec2(band, floor(uTime * 10.0)));
    float mask = step(0.88, g) * uGlitch;
    p.x += (g - 0.5) * 0.22 * mask;
  }
  float r = length(p);
  float a = atan(p.y, p.x);
  float petals = max(uPetalCount, 1.0);
  float petalWave = abs(cos(a * petals * 0.5 + uSeed * 0.01));
  petalWave = pow(petalWave, mix(1.0, 10.0, uPetalSharpness));
  float outerRadius = uRadiusOuter * mix(0.38, 1.0, petalWave);
  float petalMask = 1.0 - smoothstep(outerRadius - 0.03, outerRadius + 0.03, r);
  petalMask *= smoothstep(uRadiusInner * 0.22, uRadiusOuter, r);
  float ringMask = smoothstep(uRadiusInner * 0.38, uRadiusInner * 0.45, r)
                * (1.0 - smoothstep(uRadiusInner * 0.62, uRadiusInner * 0.76, r));
  float coreMask = 1.0 - smoothstep(0.0, uRadiusInner * 0.45, r);
  float innerFiligree = 1.0 - smoothstep(uRadiusInner * 0.12, uRadiusInner * 0.18, abs(sin(a * petals * 2.0 + uTime * 0.4)));
  vec3 color = mix(uVoidColor, uPrimaryColor, coreMask * 0.85);
  color = mix(color, mix(uPrimaryColor, uSecondaryColor, 0.5), ringMask);
  color = mix(color, mix(uPrimaryColor, uSecondaryColor, clamp(r / max(uRadiusOuter, 0.001), 0.0, 1.0)), petalMask);
  color += innerFiligree * 0.25 * uSecondaryColor;
  float breathe = 1.0 + sin(uTime * (1.4 + uEnergy * 1.8) + uPulse * 6.2831) * 0.04 * (0.4 + uEnergy);
  color *= breathe;
  float glow = uBloom * (petalMask * 0.75 + ringMask * 1.55 + coreMask * 0.65 + innerFiligree * 0.2);
  color += glow * (uPrimaryColor * 0.6 + uSecondaryColor * 0.2);
  float edge = smoothstep(1.4, 0.3, r);
  color = mix(uVoidColor * 0.8, color, edge);
  float star = step(0.9975, hash12(floor(vUV * vec2(220.0, 120.0) + uSeed)));
  color += star * (0.18 + uPulse * 0.55) * (0.8 + uCoherence * 0.6);
  color *= 0.95 + uCoherence * 0.08;
  color += uTension * 0.01 * vec3(0.1, 0.05, 0.12);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
