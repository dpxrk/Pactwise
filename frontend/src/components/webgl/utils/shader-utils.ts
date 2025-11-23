/**
 * Shader Utilities for Pactwise WebGL Landing Page
 *
 * Common GLSL shader chunks, noise functions, and utilities
 */

/**
 * 3D Simplex Noise - GLSL function
 * More efficient than Perlin noise for GPU
 */
export const simplexNoise3D = /* glsl */ `
// Simplex 3D Noise
// by Ian McEwan, Ashima Arts
vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // Permutations
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // Gradients
  float n_ = 0.142857142857; // 1.0 / 7.0
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalize gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

/**
 * Curl Noise - Creates swirling particle motion
 * Perfect for flowing particle systems
 */
export const curlNoise = /* glsl */ `
${simplexNoise3D}

vec3 curlNoise(vec3 p) {
  float eps = 0.1;

  vec3 dx = vec3(eps, 0.0, 0.0);
  vec3 dy = vec3(0.0, eps, 0.0);
  vec3 dz = vec3(0.0, 0.0, eps);

  float x = snoise(p + dy) - snoise(p - dy);
  float y = snoise(p + dz) - snoise(p - dz);
  float z = snoise(p + dx) - snoise(p - dx);

  return normalize(vec3(x, y, z));
}
`;

/**
 * Bayer Matrix for ordered dithering
 * 8x8 matrix for artistic dithering effect
 */
export const bayerMatrix8x8 = /* glsl */ `
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
`;

/**
 * Dithering function with gradient color mapping
 * Maps luminance to purple/pink gradient
 */
export const ditherWithGradient = /* glsl */ `
${bayerMatrix8x8}

vec3 ditherWithGradient(vec3 color, vec2 fragCoord, sampler2D gradientLUT, float threshold) {
  // Convert to luminance
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));

  // Get Bayer matrix value
  float bayerValue = bayerMatrix8x8(fragCoord);

  // Apply threshold with subtle animation
  float dither = step(bayerValue, luminance + threshold);

  // Map to gradient color based on luminance
  vec3 gradientColor = texture2D(gradientLUT, vec2(luminance, 0.5)).rgb;

  // Mix between gradient color and dithered version
  return mix(gradientColor * 0.5, gradientColor, dither);
}
`;

/**
 * Fresnel effect for rim lighting
 * Perfect for agent glow effects
 */
export const fresnelGlow = /* glsl */ `
float fresnel(vec3 viewDirection, vec3 normal, float power) {
  return pow(1.0 - max(0.0, dot(viewDirection, normal)), power);
}

vec3 fresnelGlow(vec3 viewDirection, vec3 normal, vec3 glowColor, float power, float intensity) {
  float fresnelFactor = fresnel(viewDirection, normal, power);
  return glowColor * fresnelFactor * intensity;
}
`;

/**
 * Depth-based fog with purple gradient
 */
export const purpleFog = /* glsl */ `
vec3 applyPurpleFog(vec3 color, float depth, vec3 fogColor, float fogNear, float fogFar) {
  float fogFactor = smoothstep(fogNear, fogFar, depth);
  return mix(color, fogColor, fogFactor);
}
`;

/**
 * Film grain effect
 */
export const filmGrain = /* glsl */ `
float random(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 applyFilmGrain(vec3 color, vec2 uv, float time, float intensity) {
  float noise = random(uv * time);
  return color + (noise - 0.5) * intensity;
}
`;

/**
 * TypeScript utilities for shader management
 */

/**
 * Create uniform object for shader materials
 */
export function createUniforms<T extends Record<string, unknown>>(
  uniforms: T
): { [K in keyof T]: { value: T[K] } } {
  const result = {} as { [K in keyof T]: { value: T[K] } };

  for (const key in uniforms) {
    result[key] = { value: uniforms[key] };
  }

  return result;
}

/**
 * Update shader uniform value
 */
export function updateUniform<T>(
  uniforms: Record<string, { value: T }>,
  name: string,
  value: T
): void {
  if (uniforms[name]) {
    uniforms[name].value = value;
  }
}

/**
 * Combine shader chunks
 */
export function combineShaderChunks(...chunks: string[]): string {
  return chunks.join('\n\n');
}
