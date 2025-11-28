/**
 * Glitch Effect Post-Processing
 *
 * Triggered at section boundaries for dramatic transitions.
 * Includes RGB split, scanlines, and block displacement.
 */

import { Effect } from 'postprocessing';
import { Uniform, Vector2, WebGLRenderer, WebGLRenderTarget } from 'three';

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uScanlineIntensity;
uniform float uRgbSplit;
uniform float uBlockSize;
uniform vec2 uResolution;
uniform float uSeed;

// Random function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Block noise
float blockNoise(vec2 uv, float blockSize) {
  vec2 block = floor(uv * blockSize);
  return random(block + uSeed);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 coord = uv;
  float intensity = uIntensity;

  // Skip effect if intensity is very low
  if (intensity < 0.01) {
    outputColor = inputColor;
    return;
  }

  // Block displacement
  float blockNoise1 = blockNoise(uv + uTime * 0.1, uBlockSize);
  float blockNoise2 = blockNoise(uv - uTime * 0.15, uBlockSize * 0.5);

  // Apply block displacement based on noise
  if (blockNoise1 > 0.8 && intensity > 0.3) {
    coord.x += (blockNoise2 - 0.5) * 0.1 * intensity;
  }
  if (blockNoise2 > 0.9 && intensity > 0.5) {
    coord.y += (blockNoise1 - 0.5) * 0.05 * intensity;
  }

  // RGB split
  float rgbOffset = uRgbSplit * intensity;
  float r = texture2D(inputBuffer, coord + vec2(rgbOffset, 0.0)).r;
  float g = texture2D(inputBuffer, coord).g;
  float b = texture2D(inputBuffer, coord - vec2(rgbOffset, 0.0)).b;

  vec3 color = vec3(r, g, b);

  // Scanlines
  float scanline = sin(uv.y * uResolution.y * 2.0 + uTime * 10.0);
  scanline = pow(scanline * 0.5 + 0.5, 2.0);
  color *= 1.0 - (1.0 - scanline) * uScanlineIntensity * intensity;

  // Horizontal tear lines
  float tearLine = step(0.98, random(vec2(floor(uv.y * 50.0 + uTime * 100.0), uSeed)));
  if (tearLine > 0.5 && intensity > 0.4) {
    color = 1.0 - color; // Invert color
  }

  // Add noise
  float noise = random(uv * uTime) * 0.1 * intensity;
  color += noise;

  // Chromatic flicker
  float flicker = 1.0 + (random(vec2(uTime * 100.0, 0.0)) - 0.5) * 0.1 * intensity;
  color *= flicker;

  outputColor = vec4(color, inputColor.a);
}
`;

export interface GlitchEffectOptions {
  intensity?: number;
  scanlineIntensity?: number;
  rgbSplit?: number;
  blockSize?: number;
}

export class GlitchEffect extends Effect {
  private startTime: number = 0;
  private duration: number = 0;
  private isActive: boolean = false;
  private targetIntensity: number = 0;

  constructor(options: GlitchEffectOptions = {}) {
    const {
      intensity = 0,
      scanlineIntensity = 0.3,
      rgbSplit = 0.01,
      blockSize = 20,
    } = options;

    super('GlitchEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['uTime', new Uniform(0)],
        ['uIntensity', new Uniform(intensity)],
        ['uScanlineIntensity', new Uniform(scanlineIntensity)],
        ['uRgbSplit', new Uniform(rgbSplit)],
        ['uBlockSize', new Uniform(blockSize)],
        ['uResolution', new Uniform(new Vector2(1920, 1080))],
        ['uSeed', new Uniform(Math.random() * 1000)],
      ]),
    });
  }

  /**
   * Trigger a glitch burst
   * @param duration - Duration in milliseconds
   * @param intensity - Peak intensity (0-1)
   */
  trigger(duration: number = 300, intensity: number = 1): void {
    this.startTime = Date.now();
    this.duration = duration;
    this.targetIntensity = intensity;
    this.isActive = true;
    // Randomize seed for variety
    this.uniforms.get('uSeed')!.value = Math.random() * 1000;
  }

  /**
   * Set base intensity (for always-on effect)
   */
  setIntensity(intensity: number): void {
    if (!this.isActive) {
      this.uniforms.get('uIntensity')!.value = intensity;
    }
  }

  /**
   * Set RGB split amount
   */
  setRgbSplit(amount: number): void {
    this.uniforms.get('uRgbSplit')!.value = amount;
  }

  /**
   * Set scanline intensity
   */
  setScanlineIntensity(intensity: number): void {
    this.uniforms.get('uScanlineIntensity')!.value = intensity;
  }

  update(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget,
    deltaTime: number
  ): void {
    // Update time
    this.uniforms.get('uTime')!.value += deltaTime;

    // Update resolution
    const size = renderer.getSize(new Vector2());
    this.uniforms.get('uResolution')!.value.set(size.x, size.y);

    // Handle triggered burst
    if (this.isActive) {
      const elapsed = Date.now() - this.startTime;
      const progress = elapsed / this.duration;

      if (progress >= 1) {
        this.isActive = false;
        this.uniforms.get('uIntensity')!.value = 0;
      } else {
        // Ease in-out intensity curve
        const t = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // Peak at middle, fade at edges
        const curve = Math.sin(t * Math.PI);
        this.uniforms.get('uIntensity')!.value = curve * this.targetIntensity;
      }
    }
  }
}

/**
 * Helper to trigger glitch at section transitions
 */
export function createSectionGlitchTrigger(
  effect: GlitchEffect,
  thresholds: number[] = [0.20, 0.45, 0.70, 0.90]
) {
  let lastSection = 0;

  return (scrollProgress: number) => {
    let currentSection = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (scrollProgress >= thresholds[i]) {
        currentSection = i + 1;
      }
    }

    if (currentSection !== lastSection) {
      effect.trigger(250, 0.8);
      lastSection = currentSection;
    }
  };
}

export default GlitchEffect;
