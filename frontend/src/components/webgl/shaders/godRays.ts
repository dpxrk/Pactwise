/**
 * God Rays (Volumetric Light) Post-Processing Effect
 *
 * Creates volumetric light rays emanating from a light source (NeuralCore).
 * Intensity tied to NeuralCore pulse for synchronized visual effect.
 */

import { Effect } from 'postprocessing';
import { Uniform, Vector2 } from 'three';

const fragmentShader = /* glsl */ `
uniform vec2 uLightPosition;
uniform float uExposure;
uniform float uDecay;
uniform float uDensity;
uniform float uWeight;
uniform float uIntensity;
uniform int uSamples;
uniform vec3 uTint;

#define MAX_SAMPLES 100

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Vector from pixel to light source
  vec2 deltaTextCoord = uv - uLightPosition;
  deltaTextCoord *= 1.0 / float(uSamples) * uDensity;

  vec2 coord = uv;
  vec3 color = inputColor.rgb;
  float illuminationDecay = 1.0;

  // March towards light source
  for (int i = 0; i < MAX_SAMPLES; i++) {
    if (i >= uSamples) break;

    coord -= deltaTextCoord;

    // Sample the scene at this position
    vec3 sampleColor = texture2D(inputBuffer, coord).rgb;

    // Calculate luminance to determine ray intensity
    float luminance = dot(sampleColor, vec3(0.299, 0.587, 0.114));

    // Apply decay and weight
    sampleColor *= illuminationDecay * uWeight;

    // Accumulate
    color += sampleColor * luminance;

    // Decay
    illuminationDecay *= uDecay;
  }

  // Apply exposure and tint
  vec3 rays = color * uExposure * uIntensity;
  rays *= uTint;

  // Blend with original
  vec3 finalColor = inputColor.rgb + rays;

  outputColor = vec4(finalColor, inputColor.a);
}
`;

export interface GodRaysOptions {
  lightPosition?: Vector2;
  exposure?: number;
  decay?: number;
  density?: number;
  weight?: number;
  intensity?: number;
  samples?: number;
  tint?: [number, number, number];
}

export class GodRaysEffect extends Effect {
  constructor(options: GodRaysOptions = {}) {
    const {
      lightPosition = new Vector2(0.5, 0.5), // Center of screen
      exposure = 0.3,
      decay = 0.96,
      density = 0.5,
      weight = 0.4,
      intensity = 1.0,
      samples = 60,
      tint = [0.8, 0.6, 1.0], // Purple tint for Pactwise brand
    } = options;

    super('GodRaysEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['uLightPosition', new Uniform(lightPosition)],
        ['uExposure', new Uniform(exposure)],
        ['uDecay', new Uniform(decay)],
        ['uDensity', new Uniform(density)],
        ['uWeight', new Uniform(weight)],
        ['uIntensity', new Uniform(intensity)],
        ['uSamples', new Uniform(samples)],
        ['uTint', new Uniform(tint)],
      ]),
    });
  }

  /**
   * Set light source position in screen space (0-1)
   */
  setLightPosition(x: number, y: number): void {
    const pos = this.uniforms.get('uLightPosition')!.value as Vector2;
    pos.set(x, y);
  }

  /**
   * Set intensity (0-1+)
   */
  setIntensity(intensity: number): void {
    this.uniforms.get('uIntensity')!.value = intensity;
  }

  /**
   * Set exposure (controls ray brightness)
   */
  setExposure(exposure: number): void {
    this.uniforms.get('uExposure')!.value = exposure;
  }

  /**
   * Set decay rate (0.9-0.99)
   */
  setDecay(decay: number): void {
    this.uniforms.get('uDecay')!.value = decay;
  }

  /**
   * Set sample count (higher = better quality, lower performance)
   */
  setSamples(samples: number): void {
    this.uniforms.get('uSamples')!.value = Math.min(100, samples);
  }

  /**
   * Set ray tint color
   */
  setTint(r: number, g: number, b: number): void {
    this.uniforms.get('uTint')!.value = [r, g, b];
  }

  /**
   * Update based on NeuralCore pulse
   * @param pulseIntensity - 0-1 pulse value from NeuralCore
   * @param scrollProgress - 0-1 scroll progress
   */
  updateFromPulse(pulseIntensity: number, scrollProgress: number): void {
    // Rays are strongest in hero section
    const scrollFactor = Math.max(0, 1 - scrollProgress * 3);
    this.setIntensity(pulseIntensity * scrollFactor * 0.8);
    this.setExposure(0.2 + pulseIntensity * 0.2);
  }
}

export default GodRaysEffect;
