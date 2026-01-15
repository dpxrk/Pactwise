/**
 * Chromatic Aberration Post-Processing Effect
 *
 * RGB channel separation that intensifies with scroll velocity.
 * Creates a premium "fast scroll" feel.
 */

import { Effect } from 'postprocessing';
import { Uniform, Vector2, WebGLRenderer, WebGLRenderTarget } from 'three';

const fragmentShader = /* glsl */ `
uniform vec2 uOffset;
uniform float uIntensity;
uniform vec2 uResolution;
uniform float uRadialFalloff;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Calculate distance from center for radial falloff
  vec2 centeredUv = uv - 0.5;
  float distFromCenter = length(centeredUv);

  // Radial falloff - effect is stronger at edges
  float radialIntensity = pow(distFromCenter * 2.0, uRadialFalloff) * uIntensity;

  // Direction-based offset (towards/away from center)
  vec2 direction = normalize(centeredUv + 0.0001);
  vec2 offset = uOffset * radialIntensity;

  // Also add radial component
  vec2 radialOffset = direction * radialIntensity * 0.02;

  // Sample each color channel with different offsets
  float r = texture2D(inputBuffer, uv + offset + radialOffset).r;
  float g = texture2D(inputBuffer, uv).g;
  float b = texture2D(inputBuffer, uv - offset - radialOffset).b;

  // Preserve alpha
  float a = inputColor.a;

  outputColor = vec4(r, g, b, a);
}
`;

export interface ChromaticAberrationOptions {
  offset?: Vector2;
  intensity?: number;
  radialFalloff?: number;
}

export class ChromaticAberrationEffect extends Effect {
  constructor(options: ChromaticAberrationOptions = {}) {
    const {
      offset = new Vector2(0.002, 0.0),
      intensity = 1.0,
      radialFalloff = 2.0,
    } = options;

    super('ChromaticAberrationEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['uOffset', new Uniform(offset)],
        ['uIntensity', new Uniform(intensity)],
        ['uResolution', new Uniform(new Vector2(1920, 1080))],
        ['uRadialFalloff', new Uniform(radialFalloff)],
      ]),
    });
  }

  /**
   * Set the chromatic aberration offset
   * @param x - Horizontal offset
   * @param y - Vertical offset (usually 0)
   */
  setOffset(x: number, y: number = 0): void {
    const offset = this.uniforms.get('uOffset')!.value as Vector2;
    offset.set(x, y);
  }

  /**
   * Set intensity (0-1)
   */
  setIntensity(intensity: number): void {
    this.uniforms.get('uIntensity')!.value = intensity;
  }

  /**
   * Set radial falloff (higher = more edge focus)
   */
  setRadialFalloff(falloff: number): void {
    this.uniforms.get('uRadialFalloff')!.value = falloff;
  }

  /**
   * Update based on scroll velocity
   * @param velocity - Normalized velocity (-1 to 1)
   */
  updateFromVelocity(velocity: number): void {
    const absVelocity = Math.abs(velocity);
    this.setOffset(absVelocity * 0.008, 0);
    this.setIntensity(absVelocity);
  }

  update(
    renderer: WebGLRenderer,
    _inputBuffer: WebGLRenderTarget,
    _deltaTime: number
  ): void {
    const size = renderer.getSize(new Vector2());
    this.uniforms.get('uResolution')!.value.set(size.x, size.y);
  }
}

export default ChromaticAberrationEffect;
