/**
 * Artistic Dithering Post-Processing Effect
 *
 * Custom post-processing effect for Pactwise landing page
 * Applies artistic dithering with purple/pink gradient color mapping
 */

import { Effect } from 'postprocessing';
import { Uniform } from 'three';
import * as THREE from 'three';

/**
 * Dither Effect Fragment Shader
 */
const fragmentShader = /* glsl */ `
uniform sampler2D gradientLUT;
uniform float uTime;
uniform float uThreshold;
uniform float uIntensity;
uniform vec2 uResolution;

// 8x8 Bayer matrix for ordered dithering
float bayerMatrix8x8(vec2 position) {
  int x = int(mod(position.x, 8.0));
  int y = int(mod(position.y, 8.0));
  int index = x + y * 8;

  // 8x8 Bayer matrix normalized to [0, 1]
  float bayerValues[64];
  bayerValues[0] = 0.0/64.0;   bayerValues[1] = 32.0/64.0;  bayerValues[2] = 8.0/64.0;   bayerValues[3] = 40.0/64.0;
  bayerValues[4] = 2.0/64.0;   bayerValues[5] = 34.0/64.0;  bayerValues[6] = 10.0/64.0;  bayerValues[7] = 42.0/64.0;
  bayerValues[8] = 48.0/64.0;  bayerValues[9] = 16.0/64.0;  bayerValues[10] = 56.0/64.0; bayerValues[11] = 24.0/64.0;
  bayerValues[12] = 50.0/64.0; bayerValues[13] = 18.0/64.0; bayerValues[14] = 58.0/64.0; bayerValues[15] = 26.0/64.0;
  bayerValues[16] = 12.0/64.0; bayerValues[17] = 44.0/64.0; bayerValues[18] = 4.0/64.0;  bayerValues[19] = 36.0/64.0;
  bayerValues[20] = 14.0/64.0; bayerValues[21] = 46.0/64.0; bayerValues[22] = 6.0/64.0;  bayerValues[23] = 38.0/64.0;
  bayerValues[24] = 60.0/64.0; bayerValues[25] = 28.0/64.0; bayerValues[26] = 52.0/64.0; bayerValues[27] = 20.0/64.0;
  bayerValues[28] = 62.0/64.0; bayerValues[29] = 30.0/64.0; bayerValues[30] = 54.0/64.0; bayerValues[31] = 22.0/64.0;
  bayerValues[32] = 3.0/64.0;  bayerValues[33] = 35.0/64.0; bayerValues[34] = 11.0/64.0; bayerValues[35] = 43.0/64.0;
  bayerValues[36] = 1.0/64.0;  bayerValues[37] = 33.0/64.0; bayerValues[38] = 9.0/64.0;  bayerValues[39] = 41.0/64.0;
  bayerValues[40] = 51.0/64.0; bayerValues[41] = 19.0/64.0; bayerValues[42] = 59.0/64.0; bayerValues[43] = 27.0/64.0;
  bayerValues[44] = 49.0/64.0; bayerValues[45] = 17.0/64.0; bayerValues[46] = 57.0/64.0; bayerValues[47] = 25.0/64.0;
  bayerValues[48] = 15.0/64.0; bayerValues[49] = 47.0/64.0; bayerValues[50] = 7.0/64.0;  bayerValues[51] = 39.0/64.0;
  bayerValues[52] = 13.0/64.0; bayerValues[53] = 45.0/64.0; bayerValues[54] = 5.0/64.0;  bayerValues[55] = 37.0/64.0;
  bayerValues[56] = 63.0/64.0; bayerValues[57] = 31.0/64.0; bayerValues[58] = 55.0/64.0; bayerValues[59] = 23.0/64.0;
  bayerValues[60] = 61.0/64.0; bayerValues[61] = 29.0/64.0; bayerValues[62] = 53.0/64.0; bayerValues[63] = 21.0/64.0;

  return bayerValues[index];
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;

  // Convert to luminance
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));

  // Calculate pixel position in screen space
  vec2 fragCoord = uv * uResolution;

  // Get Bayer matrix value
  float bayerValue = bayerMatrix8x8(fragCoord);

  // Apply threshold with subtle animation
  float animatedThreshold = uThreshold + sin(uTime * 0.5) * 0.02;
  float dither = step(bayerValue, luminance + animatedThreshold);

  // Map luminance to gradient color (purple/pink gradient)
  vec3 gradientColor = texture2D(gradientLUT, vec2(luminance, 0.5)).rgb;

  // Create dithered version
  vec3 ditheredColor = mix(gradientColor * 0.3, gradientColor, dither);

  // Mix between original and dithered based on intensity
  vec3 finalColor = mix(color, ditheredColor, uIntensity);

  outputColor = vec4(finalColor, inputColor.a);
}
`;

/**
 * Dither Effect Options
 */
export interface DitherEffectOptions {
  gradientLUT: THREE.DataTexture;
  threshold?: number;
  intensity?: number;
}

/**
 * Artistic Dithering Effect Class
 */
export class DitherEffect extends Effect {
  /**
   * Constructs a new dithering effect.
   *
   * @param options - The effect options.
   */
  constructor(options: DitherEffectOptions) {
    const {
      gradientLUT,
      threshold = 0.0,
      intensity = 1.0,
    } = options;

    super('DitherEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['gradientLUT', new Uniform(gradientLUT)],
        ['uTime', new Uniform(0)],
        ['uThreshold', new Uniform(threshold)],
        ['uIntensity', new Uniform(intensity)],
        ['uResolution', new Uniform(new THREE.Vector2(1920, 1080))],
      ]),
    });
  }

  /**
   * Updates the effect.
   *
   * @param renderer - The renderer.
   * @param inputBuffer - The input buffer.
   * @param deltaTime - The delta time in seconds.
   */
  update(
    renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget,
    deltaTime: number
  ): void {
    const uniforms = this.uniforms;

    // Update time
    uniforms.get('uTime')!.value += deltaTime;

    // Update resolution
    const size = renderer.getSize(new THREE.Vector2());
    uniforms.get('uResolution')!.value.set(size.x, size.y);
  }

  /**
   * Set dither threshold
   */
  setThreshold(threshold: number): void {
    this.uniforms.get('uThreshold')!.value = threshold;
  }

  /**
   * Set dither intensity (blend factor)
   */
  setIntensity(intensity: number): void {
    this.uniforms.get('uIntensity')!.value = intensity;
  }

  /**
   * Get current threshold
   */
  getThreshold(): number {
    return this.uniforms.get('uThreshold')!.value;
  }

  /**
   * Get current intensity
   */
  getIntensity(): number {
    return this.uniforms.get('uIntensity')!.value;
  }
}
