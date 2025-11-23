/**
 * Particle Flow Shaders
 *
 * GPU-accelerated particle system for AI agent network visualization
 * Particles flow along Bezier curves with purple/pink gradient colors
 */

import * as THREE from 'three';

/**
 * Particle Flow Vertex Shader
 */
export const particleFlowVertexShader = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform vec3 uStartPos;
uniform vec3 uControlPos;
uniform vec3 uEndPos;

attribute float aLifeTime;
attribute float aDelay;
attribute float aSpeed;
attribute vec3 aOffset;

varying float vLifeProgress;
varying vec3 vColor;

// Simplex noise for movement variation
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

  vec3 i  = floor(v + dot(v, C.yyy));
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

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Quadratic Bezier curve
vec3 quadraticBezier(vec3 p0, vec3 p1, vec3 p2, float t) {
  float s = 1.0 - t;
  return s * s * p0 + 2.0 * s * t * p1 + t * t * p2;
}

void main() {
  // Calculate life progress with delay
  float adjustedTime = (uTime - aDelay) * aSpeed;
  float life = mod(adjustedTime, aLifeTime) / aLifeTime;
  vLifeProgress = life;

  // Calculate position along Bezier curve
  vec3 curvePos = quadraticBezier(
    uStartPos + aOffset,
    uControlPos + aOffset * 0.5,
    uEndPos + aOffset,
    life
  );

  // Add noise-based turbulence
  vec3 noiseOffset = vec3(
    snoise(curvePos * 0.5 + uTime * 0.2),
    snoise(curvePos * 0.5 + uTime * 0.2 + 100.0),
    snoise(curvePos * 0.5 + uTime * 0.2 + 200.0)
  ) * 0.1;

  vec3 finalPos = curvePos + noiseOffset;

  // Purple/Pink gradient colors based on life progress
  // Dark purple (950) -> Mountbatten pink (500) -> Light purple (300)
  vec3 color1 = vec3(0.102, 0.051, 0.094);  // Purple 950
  vec3 color2 = vec3(0.620, 0.510, 0.612);  // Purple 500
  vec3 color3 = vec3(0.855, 0.710, 0.835);  // Purple 300

  if (life < 0.5) {
    vColor = mix(color1, color2, life * 2.0);
  } else {
    vColor = mix(color2, color3, (life - 0.5) * 2.0);
  }

  // Calculate size with fade in/out
  float sizeFactor = 1.0 - abs(life - 0.5) * 2.0; // Fade at start and end
  sizeFactor = smoothstep(0.0, 0.2, sizeFactor);

  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_PointSize = uSize * sizeFactor * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * Particle Flow Fragment Shader
 */
export const particleFlowFragmentShader = /* glsl */ `
varying float vLifeProgress;
varying vec3 vColor;

void main() {
  // Create circular particles
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  if (dist > 0.5) {
    discard;
  }

  // Soft edges
  float alpha = smoothstep(0.5, 0.3, dist);

  // Fade based on life progress (fade in and fade out)
  float lifeFade = 1.0 - abs(vLifeProgress - 0.5) * 2.0;
  lifeFade = smoothstep(0.0, 0.3, lifeFade);

  gl_FragColor = vec4(vColor, alpha * lifeFade * 0.8);
}
`;

/**
 * Create particle flow material
 */
export function createParticleFlowMaterial(
  startPos: THREE.Vector3,
  controlPos: THREE.Vector3,
  endPos: THREE.Vector3,
  particleCount: number = 1000,
  particleSize: number = 4.0
): THREE.ShaderMaterial {
  // Generate particle attributes
  const positions = new Float32Array(particleCount * 3);
  const lifeTimes = new Float32Array(particleCount);
  const delays = new Float32Array(particleCount);
  const speeds = new Float32Array(particleCount);
  const offsets = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    // Initial position (will be calculated in shader)
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;

    // Random lifetime
    lifeTimes[i] = 2.0 + Math.random() * 3.0;

    // Random delay for staggered start
    delays[i] = Math.random() * 5.0;

    // Random speed variation
    speeds[i] = 0.8 + Math.random() * 0.4;

    // Random offset for variation
    offsets[i * 3] = (Math.random() - 0.5) * 0.3;
    offsets[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
    offsets[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aLifeTime', new THREE.BufferAttribute(lifeTimes, 1));
  geometry.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 3));

  const material = new THREE.ShaderMaterial({
    vertexShader: particleFlowVertexShader,
    fragmentShader: particleFlowFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: particleSize },
      uStartPos: { value: startPos },
      uControlPos: { value: controlPos },
      uEndPos: { value: endPos },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return material;
}

/**
 * Create particle flow geometry
 */
export function createParticleFlowGeometry(particleCount: number): THREE.BufferGeometry {
  const positions = new Float32Array(particleCount * 3);
  const lifeTimes = new Float32Array(particleCount);
  const delays = new Float32Array(particleCount);
  const speeds = new Float32Array(particleCount);
  const offsets = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;

    lifeTimes[i] = 2.0 + Math.random() * 3.0;
    delays[i] = Math.random() * 5.0;
    speeds[i] = 0.8 + Math.random() * 0.4;

    offsets[i * 3] = (Math.random() - 0.5) * 0.3;
    offsets[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
    offsets[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aLifeTime', new THREE.BufferAttribute(lifeTimes, 1));
  geometry.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 3));

  return geometry;
}
