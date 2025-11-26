"use client";

import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import { noiseGLSL, commonGLSL, pactwiseColorsGLSL } from '../noise';

/**
 * AbstractAgentMaterial
 * Creates organic, breathing AI agent cores with:
 * - Vertex displacement using 3D noise
 * - Iridescent color shifting
 * - Fresnel edge glow
 * - Animated energy patterns
 */

const vertexShader = /* glsl */ `
${noiseGLSL}

uniform float uTime;
uniform float uNoiseScale;
uniform float uNoiseStrength;
uniform float uPulseSpeed;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vDisplacement;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  // Multi-layered noise displacement for organic deformation
  float displacement = 0.0;

  // Primary layer - slow, large deformation
  displacement += snoise(position * uNoiseScale + uTime * 0.3) * uNoiseStrength;

  // Secondary layer - faster, smaller details
  displacement += snoise(position * uNoiseScale * 2.0 + uTime * 0.5) * uNoiseStrength * 0.3;

  // Tertiary layer - subtle high-frequency detail
  displacement += snoise(position * uNoiseScale * 4.0 + uTime * 0.7) * uNoiseStrength * 0.1;

  // Breathing pulse
  float pulse = sin(uTime * uPulseSpeed) * 0.05;
  displacement += pulse;

  vDisplacement = displacement;

  vec3 newPosition = position + normal * displacement;
  vWorldPosition = (modelMatrix * vec4(newPosition, 1.0)).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const fragmentShader = /* glsl */ `
${noiseGLSL}
${commonGLSL}
${pactwiseColorsGLSL}

uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uFresnelPower;
uniform float uGlowIntensity;
uniform float uPatternScale;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying float vDisplacement;

void main() {
  // View direction for fresnel
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

  // Fresnel effect for edge glow
  float fresnelTerm = fresnel(viewDirection, vNormal, uFresnelPower);

  // Animated color shift based on position and time
  float colorMix = sin(uTime * 0.5 + vPosition.y * 2.0 + vPosition.x * 1.5) * 0.5 + 0.5;

  // Add noise-based color variation
  float noiseColor = fbm4(vPosition * uPatternScale + uTime * 0.15);
  colorMix = mix(colorMix, noiseColor * 0.5 + 0.5, 0.3);

  // Base color interpolation
  vec3 color = mix(uColor1, uColor2, colorMix);

  // Internal energy pattern
  float energyPattern = snoise(vPosition * 3.0 + uTime * 0.4);
  energyPattern = smoothstep(-0.2, 0.8, energyPattern);

  // Pulsing energy veins
  float veins = snoise(vPosition * 8.0 + vec3(uTime * 0.2, 0.0, 0.0));
  veins = pow(abs(veins), 3.0) * 0.5;

  // Add energy patterns to color
  color += energyPattern * HIGHLIGHT * 0.15;
  color += veins * ACCENT * 0.2;

  // Displacement-based brightness variation
  float displacementBrightness = vDisplacement * 2.0 + 0.5;
  color *= 0.8 + displacementBrightness * 0.4;

  // Fresnel glow
  vec3 glowColor = mix(uColor2, HIGHLIGHT, fresnelTerm);
  color += fresnelTerm * glowColor * uGlowIntensity;

  // Core glow (brightest at center-ish areas)
  float coreGlow = 1.0 - fresnelTerm;
  coreGlow = pow(coreGlow, 2.0) * 0.3;
  color += coreGlow * uColor1;

  // Subtle scanline effect
  float scan = scanline(vWorldPosition.y, uTime, 30.0, 2.0);
  color += scan * HIGHLIGHT * 0.05;

  // Alpha with fresnel falloff for soft edges
  float alpha = 0.85 + fresnelTerm * 0.15;

  gl_FragColor = vec4(color, alpha);
}
`;

// Create the shader material
const AbstractAgentMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor1: new THREE.Color('#291528'),
    uColor2: new THREE.Color('#9e829c'),
    uNoiseScale: 2.0,
    uNoiseStrength: 0.15,
    uPulseSpeed: 1.5,
    uFresnelPower: 3.0,
    uGlowIntensity: 0.5,
    uPatternScale: 2.0,
  },
  vertexShader,
  fragmentShader
);

// Extend Three.js with our custom material
extend({ AbstractAgentMaterialImpl });

// TypeScript declaration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      abstractAgentMaterialImpl: {
        ref?: React.Ref<THREE.ShaderMaterial>;
        uTime?: number;
        uColor1?: THREE.Color;
        uColor2?: THREE.Color;
        uNoiseScale?: number;
        uNoiseStrength?: number;
        uPulseSpeed?: number;
        uFresnelPower?: number;
        uGlowIntensity?: number;
        uPatternScale?: number;
        transparent?: boolean;
        side?: THREE.Side;
        depthWrite?: boolean;
      };
    }
  }
}

// Props interface for the agent component
interface AbstractAgentCoreProps {
  position?: [number, number, number];
  scale?: number;
  color1?: string;
  color2?: string;
  noiseScale?: number;
  noiseStrength?: number;
  pulseSpeed?: number;
  glowIntensity?: number;
  segments?: number;
}

/**
 * AbstractAgentCore Component
 * A breathing, organic AI agent visualization
 */
export const AbstractAgentCore: React.FC<AbstractAgentCoreProps> = ({
  position = [0, 0, 0],
  scale = 1,
  color1 = '#291528',
  color2 = '#9e829c',
  noiseScale = 2.0,
  noiseStrength = 0.15,
  pulseSpeed = 1.5,
  glowIntensity = 0.5,
  segments = 64,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const colors = useMemo(() => ({
    color1: new THREE.Color(color1),
    color2: new THREE.Color(color2),
  }), [color1, color2]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh position={position} scale={scale}>
      <icosahedronGeometry args={[1, segments / 8]} />
      <abstractAgentMaterialImpl
        ref={materialRef}
        uColor1={colors.color1}
        uColor2={colors.color2}
        uNoiseScale={noiseScale}
        uNoiseStrength={noiseStrength}
        uPulseSpeed={pulseSpeed}
        uGlowIntensity={glowIntensity}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

/**
 * AgentGlowField Component
 * Outer energy field effect around agents
 */
interface AgentGlowFieldProps {
  position?: [number, number, number];
  scale?: number;
  color?: string;
  opacity?: number;
}

export const AgentGlowField: React.FC<AgentGlowFieldProps> = ({
  position = [0, 0, 0],
  scale = 1.5,
  color = '#dab5d5',
  opacity = 0.15,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      const t = state.clock.getElapsedTime();
      materialRef.current.uniforms.uTime.value = t;
      // Pulsing opacity
      materialRef.current.uniforms.uOpacity.value =
        opacity * (0.7 + Math.sin(t * 2) * 0.3);
    }
  });

  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 32, 32]} />
      <glowFieldMaterial ref={materialRef} />
    </mesh>
  );
};

// Glow field shader material
const glowFieldVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const glowFieldFragmentShader = /* glsl */ `
${commonGLSL}

uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);

  // Inverted fresnel - fade at edges, visible at center
  float fresnelTerm = fresnel(viewDirection, vNormal, 2.0);

  // Pulse effect
  float pulse = sin(uTime * 3.0) * 0.5 + 0.5;

  vec3 color = uColor;
  float alpha = (1.0 - fresnelTerm) * uOpacity * (0.5 + pulse * 0.5);

  gl_FragColor = vec4(color, alpha);
}
`;

const GlowFieldMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#dab5d5'),
    uOpacity: 0.15,
  },
  glowFieldVertexShader,
  glowFieldFragmentShader
);

extend({ GlowFieldMaterial: GlowFieldMaterialImpl });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      glowFieldMaterial: {
        ref?: React.Ref<THREE.ShaderMaterial>;
        uTime?: number;
        uColor?: THREE.Color;
        uOpacity?: number;
        transparent?: boolean;
        side?: THREE.Side;
        depthWrite?: boolean;
      };
    }
  }
}

export default AbstractAgentCore;
