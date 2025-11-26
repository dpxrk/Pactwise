"use client";

import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import { noiseGLSL, commonGLSL, pactwiseColorsGLSL } from '../noise';

/**
 * HolographicMaterial
 * Sci-fi holographic displays with:
 * - Animated scanlines
 * - Glitch effects
 * - SDF shapes
 * - Progress indicators
 */

const holographicVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const holographicFragmentShader = /* glsl */ `
${noiseGLSL}
${commonGLSL}
${pactwiseColorsGLSL}

uniform float uTime;
uniform float uValue;
uniform vec3 uColor;
uniform float uScanlineIntensity;
uniform float uGlitchIntensity;
uniform float uOpacity;
uniform int uDisplayType; // 0 = gauge, 1 = ring, 2 = bar

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vNormal;

#define PI 3.14159265359

void main() {
  vec2 uv = vUv;

  // Glitch offset
  float glitchOffset = glitch(uTime, uGlitchIntensity);
  uv.x += glitchOffset;

  // Scanline effect
  float scanLine = scanline(vWorldPosition.y, uTime, 50.0, 3.0) * uScanlineIntensity;

  // Horizontal scanline sweep
  float sweep = mod(uTime * 0.5, 2.0);
  float sweepLine = smoothstep(sweep - 0.02, sweep, vUv.y) - smoothstep(sweep, sweep + 0.02, vUv.y);
  sweepLine *= 0.3;

  vec3 color = uColor;
  float alpha = uOpacity;

  if (uDisplayType == 0) {
    // Gauge display - circular progress
    vec2 center = uv - 0.5;
    float dist = length(center);
    float angle = atan(center.y, center.x);
    float progress = (angle + PI) / (2.0 * PI);

    // Outer ring
    float ring = smoothstep(0.38, 0.40, dist) - smoothstep(0.44, 0.46, dist);

    // Progress arc
    float progressFill = step(progress, uValue);

    // Tick marks
    float ticks = 0.0;
    for (float i = 0.0; i < 1.0; i += 0.1) {
      float tickAngle = i * 2.0 * PI - PI;
      vec2 tickDir = vec2(cos(tickAngle), sin(tickAngle));
      float tickDist = abs(dot(center, vec2(-tickDir.y, tickDir.x)));
      ticks += smoothstep(0.01, 0.005, tickDist) * smoothstep(0.35, 0.36, dist) * smoothstep(0.48, 0.47, dist);
    }

    // Glow at progress edge
    float progressAngle = uValue * 2.0 * PI - PI;
    vec2 progressDir = vec2(cos(progressAngle), sin(progressAngle));
    float edgeGlow = exp(-length(center - progressDir * 0.42) * 10.0) * 0.5;

    color = uColor * (ring * progressFill + ticks * 0.5);
    color += HIGHLIGHT * edgeGlow;
    color += scanLine * HIGHLIGHT * 0.1;

    // Center value display area
    float centerDisc = 1.0 - smoothstep(0.0, 0.35, dist);
    color += centerDisc * uColor * 0.1;

    alpha = (ring * progressFill + ticks * 0.3 + edgeGlow + centerDisc * 0.3) * uOpacity;

  } else if (uDisplayType == 1) {
    // Concentric rings progress
    vec2 center = uv - 0.5;
    float dist = length(center);

    float rings = 0.0;
    float ringCount = 4.0;

    for (float i = 0.0; i < ringCount; i++) {
      float ringRadius = 0.1 + i * 0.1;
      float ringWidth = 0.02;
      float ring = smoothstep(ringRadius - ringWidth, ringRadius, dist) -
                   smoothstep(ringRadius, ringRadius + ringWidth, dist);

      // Animated fill based on value and ring index
      float ringProgress = uValue - i * 0.2;
      ringProgress = clamp(ringProgress * 5.0, 0.0, 1.0);

      // Rotation animation
      float rotAngle = atan(center.y, center.x) + uTime * 0.2 * (1.0 + i * 0.5);
      float segmentMask = smoothstep(-0.1, 0.0, sin(rotAngle * 8.0));

      rings += ring * ringProgress * segmentMask;
    }

    color = uColor * rings;
    color += HIGHLIGHT * rings * 0.3;
    color += scanLine * 0.1;

    // Center core
    float core = exp(-dist * 8.0) * 0.5;
    color += core * ACCENT;

    alpha = (rings + core) * uOpacity;

  } else {
    // Bar chart style
    float barIndex = floor(uv.x * 4.0);
    float barProgress = fract(uv.x * 4.0);

    // Different heights for each bar
    float barHeight = 0.2 + hash(barIndex) * 0.6;
    barHeight *= uValue;

    // Animate bars
    barHeight *= 0.8 + sin(uTime * 2.0 + barIndex) * 0.2;

    float bar = step(uv.y, barHeight) * step(0.1, barProgress) * step(barProgress, 0.9);

    // Grid lines
    float gridH = step(0.98, fract(uv.y * 10.0));
    float gridV = step(0.95, fract(uv.x * 4.0));

    color = uColor * bar;
    color += HIGHLIGHT * bar * (1.0 - uv.y) * 0.5;
    color += (gridH + gridV) * 0.1;
    color += scanLine * 0.1;

    alpha = (bar + gridH * 0.2 + gridV * 0.2) * uOpacity;
  }

  // Fresnel edge effect
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.0);
  color += fresnel * uColor * 0.2;

  // Add sweep line
  color += sweepLine * HIGHLIGHT;

  gl_FragColor = vec4(color, alpha);
}
`;

// Holographic material implementation
const HolographicMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uValue: 0.5,
    uColor: new THREE.Color('#9e829c'),
    uScanlineIntensity: 0.15,
    uGlitchIntensity: 0.02,
    uOpacity: 0.9,
    uDisplayType: 0,
  },
  holographicVertexShader,
  holographicFragmentShader
);

extend({ HolographicMaterial: HolographicMaterialImpl });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      holographicMaterial: {
        ref?: React.Ref<THREE.ShaderMaterial>;
        uTime?: number;
        uValue?: number;
        uColor?: THREE.Color;
        uScanlineIntensity?: number;
        uGlitchIntensity?: number;
        uOpacity?: number;
        uDisplayType?: number;
        transparent?: boolean;
        side?: THREE.Side;
        depthWrite?: boolean;
      };
    }
  }
}

/**
 * HolographicGauge Component
 * Circular progress gauge with holographic effect
 */
interface HolographicGaugeProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  value: number;
  size?: number;
  color?: string;
  label?: string;
}

export const HolographicGauge: React.FC<HolographicGaugeProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  value,
  size = 2,
  color = '#9e829c',
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const colorUniform = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      // Smooth value transition
      const currentValue = materialRef.current.uniforms.uValue.value;
      materialRef.current.uniforms.uValue.value += (value - currentValue) * 0.05;
    }
  });

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[size, size, 32, 32]} />
      <holographicMaterial
        ref={materialRef}
        uValue={value}
        uColor={colorUniform}
        uDisplayType={0}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

/**
 * HolographicRings Component
 * Concentric progress rings
 */
interface HolographicRingsProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  value: number;
  size?: number;
  color?: string;
}

export const HolographicRings: React.FC<HolographicRingsProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  value,
  size = 2,
  color = '#c388bb',
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const colorUniform = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      const currentValue = materialRef.current.uniforms.uValue.value;
      materialRef.current.uniforms.uValue.value += (value - currentValue) * 0.05;
    }
  });

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[size, size, 32, 32]} />
      <holographicMaterial
        ref={materialRef}
        uValue={value}
        uColor={colorUniform}
        uDisplayType={1}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

/**
 * HolographicBars Component
 * Bar chart visualization
 */
interface HolographicBarsProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  value: number;
  width?: number;
  height?: number;
  color?: string;
}

export const HolographicBars: React.FC<HolographicBarsProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  value,
  width = 3,
  height = 2,
  color = '#9e829c',
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const colorUniform = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      const currentValue = materialRef.current.uniforms.uValue.value;
      materialRef.current.uniforms.uValue.value += (value - currentValue) * 0.05;
    }
  });

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height, 32, 32]} />
      <holographicMaterial
        ref={materialRef}
        uValue={value}
        uColor={colorUniform}
        uDisplayType={2}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

/**
 * FloatingHologramFrame Component
 * Decorative frame around holographic displays
 */
interface FloatingHologramFrameProps {
  position?: [number, number, number];
  size?: [number, number];
  color?: string;
}

const frameVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const frameFragmentShader = /* glsl */ `
${commonGLSL}
${pactwiseColorsGLSL}

uniform float uTime;
uniform vec3 uColor;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vec2 uv = vUv;

  // Frame edges
  float edgeWidth = 0.02;
  float left = smoothstep(0.0, edgeWidth, uv.x) - smoothstep(edgeWidth, edgeWidth * 2.0, uv.x);
  float right = smoothstep(1.0 - edgeWidth * 2.0, 1.0 - edgeWidth, uv.x) - smoothstep(1.0 - edgeWidth, 1.0, uv.x);
  float top = smoothstep(1.0 - edgeWidth * 2.0, 1.0 - edgeWidth, uv.y) - smoothstep(1.0 - edgeWidth, 1.0, uv.y);
  float bottom = smoothstep(0.0, edgeWidth, uv.y) - smoothstep(edgeWidth, edgeWidth * 2.0, uv.y);

  float frame = left + right + top + bottom;

  // Corner accents
  float cornerSize = 0.1;
  float corner1 = step(uv.x, cornerSize) * step(uv.y, cornerSize);
  float corner2 = step(1.0 - cornerSize, uv.x) * step(uv.y, cornerSize);
  float corner3 = step(uv.x, cornerSize) * step(1.0 - cornerSize, uv.y);
  float corner4 = step(1.0 - cornerSize, uv.x) * step(1.0 - cornerSize, uv.y);
  float corners = (corner1 + corner2 + corner3 + corner4) * 0.3;

  // Animated pulse along frame
  float pulse = sin(uTime * 2.0 + uv.x * 10.0 + uv.y * 10.0) * 0.5 + 0.5;

  vec3 color = uColor * frame;
  color += HIGHLIGHT * corners;
  color *= 0.7 + pulse * 0.3;

  // Scanline
  float scan = scanline(vWorldPosition.y, uTime, 30.0, 2.0) * 0.1;
  color += scan * HIGHLIGHT;

  float alpha = (frame + corners) * 0.6;

  gl_FragColor = vec4(color, alpha);
}
`;

const FrameMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#9e829c'),
  },
  frameVertexShader,
  frameFragmentShader
);

extend({ FrameMaterial: FrameMaterialImpl });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      frameMaterial: {
        ref?: React.Ref<THREE.ShaderMaterial>;
        uTime?: number;
        uColor?: THREE.Color;
        transparent?: boolean;
        side?: THREE.Side;
        depthWrite?: boolean;
      };
    }
  }
}

export const FloatingHologramFrame: React.FC<FloatingHologramFrameProps> = ({
  position = [0, 0, 0],
  size = [2, 2],
  color = '#9e829c',
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const colorUniform = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh position={position}>
      <planeGeometry args={[size[0], size[1]]} />
      <frameMaterial
        ref={materialRef}
        uColor={colorUniform}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

export default HolographicGauge;
