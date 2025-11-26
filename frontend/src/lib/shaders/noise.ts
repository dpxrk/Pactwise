/**
 * GLSL Noise Functions
 * Simplex noise and Fractal Brownian Motion for organic shader effects
 * Based on: https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
 */

export const noiseGLSL = /* glsl */ `
//
// Simplex 3D Noise
// by Ian McEwan, Ashima Arts
//
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i = floor(v + dot(v, C.yyy));
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
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  float n_ = 0.142857142857; // 1.0/7.0
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

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Fractal Brownian Motion - layered noise for organic complexity
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for(int i = 0; i < 8; i++) {
    if(i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

// 4-octave FBM (most common use case)
float fbm4(vec3 p) {
  return fbm(p, 4);
}

// 6-octave FBM for more detail
float fbm6(vec3 p) {
  return fbm(p, 6);
}
`;

export const commonGLSL = /* glsl */ `
// Common utility functions for shaders

// Smooth minimum for organic blending
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Remap value from one range to another
float remap(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

// Smooth step with custom edges
float smootherstep(float edge0, float edge1, float x) {
  x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

// Cubic Bezier curve
vec3 bezier(vec3 p0, vec3 p1, vec3 p2, vec3 p3, float t) {
  float t2 = t * t;
  float t3 = t2 * t;
  float mt = 1.0 - t;
  float mt2 = mt * mt;
  float mt3 = mt2 * mt;
  return p0 * mt3 + p1 * 3.0 * mt2 * t + p2 * 3.0 * mt * t2 + p3 * t3;
}

// Quadratic Bezier curve
vec3 bezier2(vec3 p0, vec3 p1, vec3 p2, float t) {
  float mt = 1.0 - t;
  return p0 * mt * mt + p1 * 2.0 * mt * t + p2 * t * t;
}

// Rotate 2D point
vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Hash function for pseudo-random values
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

vec3 hash3(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return fract(sin(p) * 43758.5453123);
}

// Fresnel effect for edge glow
float fresnel(vec3 viewDir, vec3 normal, float power) {
  return pow(1.0 - max(dot(viewDir, normal), 0.0), power);
}

// Signed distance functions for shapes
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

// Scanline effect
float scanline(float y, float time, float frequency, float speed) {
  return pow(sin(y * frequency + time * speed) * 0.5 + 0.5, 8.0);
}

// Glitch offset
float glitch(float time, float intensity) {
  float t = floor(time * 20.0);
  return (hash(t) - 0.5) * intensity * step(0.95, hash(t + 100.0));
}
`;

// Pactwise brand colors as GLSL vec3
export const pactwiseColorsGLSL = /* glsl */ `
// Pactwise brand color palette
const vec3 DEEP_PURPLE = vec3(0.161, 0.082, 0.157);    // #291528
const vec3 WARM_PURPLE = vec3(0.290, 0.145, 0.271);    // #4a2545
const vec3 PRIMARY = vec3(0.620, 0.510, 0.612);        // #9e829c
const vec3 HIGHLIGHT = vec3(0.855, 0.710, 0.835);      // #dab5d5
const vec3 ACCENT = vec3(0.765, 0.533, 0.733);         // #c388bb
const vec3 WHITE = vec3(0.941, 0.937, 0.957);          // #f0eff4
const vec3 CONTRACT_PINK = vec3(0.765, 0.533, 0.733);  // #c388bb
const vec3 INSIGHT_GOLD = vec3(0.984, 0.749, 0.141);   // #fbbf24
`;
