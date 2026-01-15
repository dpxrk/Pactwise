"use client";

import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

import { noiseGLSL, commonGLSL, pactwiseColorsGLSL } from '../noise';

/**
 * EnvironmentMaterial
 * Procedural environment shaders for:
 * - Animated gradient backgrounds
 * - Infinite grid with depth fade
 * - Volumetric fog effect
 * - Floating ambient particles
 */

// Background gradient shader
const backgroundVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const backgroundFragmentShader = /* glsl */ `
${noiseGLSL}
${commonGLSL}
${pactwiseColorsGLSL}

uniform float uTime;
uniform float uScrollProgress;
uniform float uNoiseScale;
uniform float uNoiseIntensity;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vec2 uv = vUv;

  // Animated gradient position
  float gradientPos = uv.y;

  // Add wave distortion
  gradientPos += sin(uv.x * 3.0 + uTime * 0.2) * 0.05;
  gradientPos += sin(uv.x * 7.0 - uTime * 0.15) * 0.02;

  // Scroll-based shift
  gradientPos += uScrollProgress * 0.2;

  // Clamp for smooth gradients
  gradientPos = clamp(gradientPos, 0.0, 1.0);

  // Three-color gradient (deep purple -> warm purple -> soft pink)
  vec3 color;
  if (gradientPos < 0.4) {
    color = mix(DEEP_PURPLE, WARM_PURPLE, gradientPos / 0.4);
  } else if (gradientPos < 0.7) {
    color = mix(WARM_PURPLE, PRIMARY, (gradientPos - 0.4) / 0.3);
  } else {
    color = mix(PRIMARY, HIGHLIGHT * 0.5 + PRIMARY * 0.5, (gradientPos - 0.7) / 0.3);
  }

  // Add noise texture for organic feel
  float noise = fbm4(vec3(uv * uNoiseScale, uTime * 0.05));
  color += noise * uNoiseIntensity;

  // Subtle vignette
  float vignette = 1.0 - length((uv - 0.5) * 1.2);
  vignette = smoothstep(0.0, 0.7, vignette);
  color *= 0.8 + vignette * 0.2;

  // Very subtle scanlines
  float scanline = sin(uv.y * 400.0) * 0.5 + 0.5;
  scanline = pow(scanline, 20.0) * 0.02;
  color -= scanline;

  gl_FragColor = vec4(color, 1.0);
}
`;

const BackgroundMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uScrollProgress: 0,
    uNoiseScale: 3.0,
    uNoiseIntensity: 0.02,
  },
  backgroundVertexShader,
  backgroundFragmentShader
);

extend({ BackgroundMaterial: BackgroundMaterialImpl });

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      backgroundMaterial: {
        ref?: React.Ref<THREE.ShaderMaterial>;
        uTime?: number;
        uScrollProgress?: number;
        uNoiseScale?: number;
        uNoiseIntensity?: number;
        side?: THREE.Side;
        depthWrite?: boolean;
      };
    }
  }
}

/**
 * ProceduralBackground Component
 * Full-screen animated gradient background
 */
interface ProceduralBackgroundProps {
  scrollProgress?: number;
}

export const ProceduralBackground: React.FC<ProceduralBackgroundProps> = ({
  scrollProgress = 0,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uScrollProgress.value = scrollProgress;
    }
  });

  return (
    <mesh position={[0, 0, -50]} scale={[100, 100, 1]}>
      <planeGeometry args={[1, 1]} />
      {/* @ts-expect-error - Custom Three.js shader material */}
      <backgroundMaterial
        ref={materialRef}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// Infinite grid shader
const gridVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vFogFactor;

uniform float uFogDensity;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // Calculate fog factor based on distance
  float dist = length(worldPos.xyz - cameraPosition);
  vFogFactor = 1.0 - exp(-uFogDensity * dist * dist);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const gridFragmentShader = /* glsl */ `
${noiseGLSL}
${pactwiseColorsGLSL}

uniform float uTime;
uniform float uGridSize;
uniform float uLineWidth;
uniform vec3 uGridColor;
uniform float uOpacity;
uniform float uPulseSpeed;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vFogFactor;

void main() {
  // Create grid pattern using world position
  vec2 gridPos = vWorldPosition.xz / uGridSize;

  // Grid lines
  vec2 grid = abs(fract(gridPos - 0.5) - 0.5);
  float lineX = smoothstep(uLineWidth, 0.0, grid.x);
  float lineZ = smoothstep(uLineWidth, 0.0, grid.y);
  float gridLine = max(lineX, lineZ);

  // Major grid lines every 5 units
  vec2 majorGridPos = vWorldPosition.xz / (uGridSize * 5.0);
  vec2 majorGrid = abs(fract(majorGridPos - 0.5) - 0.5);
  float majorLineX = smoothstep(uLineWidth * 2.0, 0.0, majorGrid.x);
  float majorLineZ = smoothstep(uLineWidth * 2.0, 0.0, majorGrid.y);
  float majorGridLine = max(majorLineX, majorLineZ);

  // Combine grids
  float finalGrid = gridLine * 0.3 + majorGridLine * 0.7;

  // Pulsing glow on grid intersections
  float intersection = lineX * lineZ;
  float pulse = sin(uTime * uPulseSpeed + vWorldPosition.x * 0.5 + vWorldPosition.z * 0.5) * 0.5 + 0.5;
  intersection *= pulse;

  // Distance-based fade
  float distFade = 1.0 - smoothstep(0.0, 30.0, length(vWorldPosition.xz));

  vec3 color = uGridColor * finalGrid;
  color += HIGHLIGHT * intersection * 0.3;

  // Apply fog
  float alpha = (finalGrid + intersection * 0.5) * uOpacity * distFade * (1.0 - vFogFactor * 0.8);

  gl_FragColor = vec4(color, alpha);
}
`;

const GridMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uGridSize: 2.0,
    uLineWidth: 0.02,
    uGridColor: new THREE.Color('#9e829c'),
    uOpacity: 0.4,
    uPulseSpeed: 1.0,
    uFogDensity: 0.002,
  },
  gridVertexShader,
  gridFragmentShader
);

extend({ GridMaterial: GridMaterialImpl });

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      gridMaterial: {
        ref?: React.Ref<THREE.ShaderMaterial>;
        uTime?: number;
        uGridSize?: number;
        uLineWidth?: number;
        uGridColor?: THREE.Color;
        uOpacity?: number;
        uPulseSpeed?: number;
        uFogDensity?: number;
        transparent?: boolean;
        side?: THREE.Side;
        depthWrite?: boolean;
      };
    }
  }
}

/**
 * InfiniteGrid Component
 * Procedural grid floor with fog fade
 */
interface InfiniteGridProps {
  position?: [number, number, number];
  size?: number;
  gridSize?: number;
  color?: string;
  opacity?: number;
}

export const InfiniteGrid: React.FC<InfiniteGridProps> = ({
  position = [0, -3, 0],
  size = 100,
  gridSize = 2.0,
  color = '#9e829c',
  opacity = 0.4,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const colorUniform = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={gridVertexShader}
        fragmentShader={gridFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uGridSize: { value: gridSize },
          uLineWidth: { value: 0.02 },
          uGridColor: { value: colorUniform },
          uOpacity: { value: opacity },
          uPulseSpeed: { value: 1.0 },
          uFogDensity: { value: 0.001 },
        }}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// Ambient particles shader
const ambientParticleVertexShader = /* glsl */ `
${noiseGLSL}

attribute float aSize;
attribute float aSpeed;
attribute float aOffset;

uniform float uTime;
uniform float uPointSize;

varying float vAlpha;
varying float vDepth;

void main() {
  vec3 pos = position;

  // Floating motion using noise
  float noiseTime = uTime * aSpeed;
  pos.x += snoise(vec3(position.y * 0.5, noiseTime, aOffset)) * 0.5;
  pos.y += snoise(vec3(position.x * 0.5 + 100.0, noiseTime, aOffset)) * 0.3;
  pos.z += snoise(vec3(position.x * 0.3, position.y * 0.3 + 200.0, noiseTime + aOffset)) * 0.5;

  // Vertical drift
  pos.y += mod(uTime * aSpeed * 0.5 + aOffset * 10.0, 20.0) - 10.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Depth-based alpha
  vDepth = -mvPosition.z;
  vAlpha = smoothstep(50.0, 5.0, vDepth) * smoothstep(0.0, 2.0, vDepth);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uPointSize * aSize * (200.0 / -mvPosition.z);
}
`;

const ambientParticleFragmentShader = /* glsl */ `
${pactwiseColorsGLSL}

uniform vec3 uColor;

varying float vAlpha;
varying float vDepth;

void main() {
  // Soft circular point
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

  // Glow effect
  float glow = exp(-dist * 4.0) * 0.5;

  vec3 color = uColor;
  color += glow * HIGHLIGHT;

  // Depth-based color shift (farther = more purple)
  float depthMix = smoothstep(5.0, 40.0, vDepth);
  color = mix(color, DEEP_PURPLE * 2.0, depthMix * 0.3);

  gl_FragColor = vec4(color, (alpha + glow) * vAlpha * 0.6);
}
`;

const AmbientParticleMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uPointSize: 3.0,
    uColor: new THREE.Color('#dab5d5'),
  },
  ambientParticleVertexShader,
  ambientParticleFragmentShader
);

extend({ AmbientParticleMaterial: AmbientParticleMaterialImpl });

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      ambientParticleMaterial: {
        ref?: React.Ref<THREE.ShaderMaterial>;
        uTime?: number;
        uPointSize?: number;
        uColor?: THREE.Color;
        transparent?: boolean;
        depthWrite?: boolean;
        blending?: THREE.Blending;
      };
    }
  }
}

/**
 * AmbientParticleField Component
 * Floating particles for atmosphere
 */
interface AmbientParticleFieldProps {
  count?: number;
  spread?: [number, number, number];
  color?: string;
  pointSize?: number;
}

export const AmbientParticleField: React.FC<AmbientParticleFieldProps> = ({
  count = 500,
  spread = [40, 20, 40],
  color = '#dab5d5',
  pointSize = 3.0,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, sizes, speeds, offsets } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread[0];
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread[1];
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread[2];

      sizes[i] = 0.3 + Math.random() * 0.7;
      speeds[i] = 0.2 + Math.random() * 0.8;
      offsets[i] = Math.random() * 100;
    }

    return { positions, sizes, speeds, offsets };
  }, [count, spread]);

  const colorUniform = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          args={[speeds, 1]}
        />
        <bufferAttribute
          attach="attributes-aOffset"
          args={[offsets, 1]}
        />
      </bufferGeometry>
      {/* @ts-expect-error - Custom Three.js shader material */}
      <ambientParticleMaterial
        ref={materialRef}
        uPointSize={pointSize}
        uColor={colorUniform}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/**
 * EnvironmentSetup Component
 * Complete environment with background, grid, and particles
 */
interface EnvironmentSetupProps {
  scrollProgress?: number;
  showGrid?: boolean;
  showParticles?: boolean;
  particleCount?: number;
}

export const EnvironmentSetup: React.FC<EnvironmentSetupProps> = ({
  scrollProgress = 0,
  showGrid = true,
  showParticles = true,
  particleCount = 300,
}) => {
  return (
    <group>
      <ProceduralBackground scrollProgress={scrollProgress} />
      {showGrid && <InfiniteGrid position={[0, -4, 0]} opacity={0.3} />}
      {showParticles && (
        <AmbientParticleField
          count={particleCount}
          spread={[50, 25, 50]}
          pointSize={2.5}
        />
      )}
    </group>
  );
};

export default EnvironmentSetup;
