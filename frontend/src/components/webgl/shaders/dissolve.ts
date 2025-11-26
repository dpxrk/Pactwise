/**
 * Dissolution Particle Shader
 *
 * Transforms captured HTML sections into particle clouds that
 * explode outward and reform. The signature "wow" effect.
 */

// Vertex Shader - handles particle positions and animation
export const dissolveVertexShader = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uExplosionForce;
uniform vec3 uTargetPosition;
uniform float uTurbulence;

attribute vec3 aOriginalPosition;
attribute vec3 aRandomOffset;
attribute vec2 aUvOffset;
attribute float aDelay;
attribute float aSpeed;

varying vec2 vUv;
varying float vProgress;
varying float vAlpha;
varying vec3 vColor;

// Simplex noise for turbulence
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  // Calculate adjusted progress with per-particle delay
  float adjustedProgress = clamp((uProgress - aDelay) / (1.0 - aDelay), 0.0, 1.0);
  adjustedProgress = pow(adjustedProgress, 0.8); // Ease curve

  vProgress = adjustedProgress;
  vUv = aUvOffset;

  // Calculate explosion direction (outward from center)
  vec3 explosionDir = normalize(aOriginalPosition - uTargetPosition);

  // Add turbulence
  vec3 noiseOffset = vec3(
    snoise(aOriginalPosition * 2.0 + uTime * 0.5),
    snoise(aOriginalPosition * 2.0 + uTime * 0.5 + 100.0),
    snoise(aOriginalPosition * 2.0 + uTime * 0.5 + 200.0)
  ) * uTurbulence * adjustedProgress;

  // Calculate position based on progress
  // At progress 0: original position
  // At progress 1: exploded outward
  vec3 explodedPosition = aOriginalPosition +
    explosionDir * uExplosionForce * adjustedProgress +
    aRandomOffset * adjustedProgress * 2.0 +
    noiseOffset;

  // Lerp between original and exploded
  vec3 finalPosition = mix(aOriginalPosition, explodedPosition, adjustedProgress);

  // Add some rotation based on progress
  float angle = adjustedProgress * 3.14159 * aSpeed;
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  finalPosition.xy = rot * finalPosition.xy;

  // Scale down as particles explode
  float scale = 1.0 - adjustedProgress * 0.5;

  // Calculate alpha (fade out as particles explode)
  vAlpha = 1.0 - adjustedProgress;

  // Purple gradient coloring based on position and progress
  float colorMix = (finalPosition.y + 5.0) / 10.0 + adjustedProgress * 0.5;
  vec3 color1 = vec3(0.161, 0.082, 0.157); // #291528
  vec3 color2 = vec3(0.620, 0.510, 0.612); // #9e829c
  vec3 color3 = vec3(0.855, 0.710, 0.835); // #dab5d5
  vColor = mix(mix(color1, color2, colorMix), color3, adjustedProgress);

  vec4 mvPosition = modelViewMatrix * vec4(finalPosition * scale, 1.0);
  gl_PointSize = (3.0 * scale) * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment Shader - renders particles with color from texture
export const dissolveFragmentShader = /* glsl */ `
uniform sampler2D uTexture;
uniform float uProgress;
uniform float uTime;

varying vec2 vUv;
varying float vProgress;
varying float vAlpha;
varying vec3 vColor;

void main() {
  // Create circular particle
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);

  // Soft edge
  float alpha = smoothstep(0.5, 0.3, dist);

  // Sample texture color at original UV
  vec4 texColor = texture2D(uTexture, vUv);

  // Mix texture color with purple gradient based on progress
  vec3 finalColor = mix(texColor.rgb, vColor, vProgress * 0.7);

  // Add glow
  finalColor += vColor * 0.2 * (1.0 - vProgress);

  // Apply alpha
  float finalAlpha = alpha * vAlpha * texColor.a;

  // Discard nearly transparent fragments
  if (finalAlpha < 0.01) discard;

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

/**
 * Generate particle attributes for dissolution effect
 */
export function generateDissolveParticles(
  width: number,
  height: number,
  density: number = 100
): {
  positions: Float32Array;
  originalPositions: Float32Array;
  randomOffsets: Float32Array;
  uvOffsets: Float32Array;
  delays: Float32Array;
  speeds: Float32Array;
  count: number;
} {
  // Calculate grid dimensions
  const aspectRatio = width / height;
  const cols = Math.floor(Math.sqrt(density * aspectRatio));
  const rows = Math.floor(density / cols);
  const count = cols * rows;

  const positions = new Float32Array(count * 3);
  const originalPositions = new Float32Array(count * 3);
  const randomOffsets = new Float32Array(count * 3);
  const uvOffsets = new Float32Array(count * 2);
  const delays = new Float32Array(count);
  const speeds = new Float32Array(count);

  // Scale factor to fit in 3D space
  const scaleX = 10 * aspectRatio;
  const scaleY = 10;

  let index = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = index * 3;
      const uvIndex = index * 2;

      // Position in 3D space (centered)
      const x = (col / (cols - 1) - 0.5) * scaleX;
      const y = (row / (rows - 1) - 0.5) * scaleY;
      const z = 0;

      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = z;

      originalPositions[i] = x;
      originalPositions[i + 1] = y;
      originalPositions[i + 2] = z;

      // Random offset for explosion variation
      randomOffsets[i] = (Math.random() - 0.5) * 3;
      randomOffsets[i + 1] = (Math.random() - 0.5) * 3;
      randomOffsets[i + 2] = (Math.random() - 0.5) * 3;

      // UV coordinates for texture sampling
      uvOffsets[uvIndex] = col / (cols - 1);
      uvOffsets[uvIndex + 1] = 1 - row / (rows - 1); // Flip Y

      // Delay based on distance from center (center particles explode first)
      const distFromCenter = Math.sqrt(x * x + y * y) / Math.sqrt(scaleX * scaleX + scaleY * scaleY);
      delays[index] = distFromCenter * 0.3;

      // Random speed multiplier
      speeds[index] = 0.5 + Math.random() * 1.5;

      index++;
    }
  }

  return {
    positions,
    originalPositions,
    randomOffsets,
    uvOffsets,
    delays,
    speeds,
    count,
  };
}

export default {
  vertexShader: dissolveVertexShader,
  fragmentShader: dissolveFragmentShader,
  generateParticles: generateDissolveParticles,
};
