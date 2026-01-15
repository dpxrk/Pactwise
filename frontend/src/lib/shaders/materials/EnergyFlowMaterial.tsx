"use client";

import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

import { noiseGLSL, commonGLSL, pactwiseColorsGLSL } from '../noise';

/**
 * EnergyFlowMaterial
 * GPU-computed particle trails for data stream visualization
 * - Bezier curve flow paths
 * - Noise-perturbed movement
 * - Soft glow with trail fade
 */

const flowParticleVertexShader = /* glsl */ `
${noiseGLSL}
${commonGLSL}

attribute float aProgress;
attribute float aOffset;
attribute float aSpeed;
attribute vec3 aStartPos;
attribute vec3 aEndPos;

uniform float uTime;
uniform float uFlowSpeed;
uniform float uNoiseAmount;
uniform float uPointSize;

varying float vProgress;
varying float vOpacity;

void main() {
  // Calculate progress along path with offset and speed variation
  float t = mod(aProgress + uTime * uFlowSpeed * aSpeed + aOffset, 1.0);
  vProgress = t;

  // Bezier control points for curved path
  vec3 p0 = aStartPos;
  vec3 p3 = aEndPos;

  // Create control points for curve
  vec3 mid = (p0 + p3) * 0.5;
  vec3 offset1 = vec3(
    snoise(vec3(aOffset * 10.0, 0.0, 0.0)) * 2.0,
    snoise(vec3(aOffset * 10.0 + 100.0, 0.0, 0.0)) * 1.5,
    snoise(vec3(aOffset * 10.0 + 200.0, 0.0, 0.0)) * 1.0
  );
  vec3 p1 = mix(p0, mid, 0.33) + offset1;
  vec3 p2 = mix(mid, p3, 0.33) - offset1 * 0.5;

  // Calculate position on bezier curve
  vec3 pos = bezier(p0, p1, p2, p3, t);

  // Add noise perturbation for organic movement
  float noiseTime = uTime * 0.5;
  pos += vec3(
    snoise(vec3(t * 10.0, noiseTime, aOffset)) * uNoiseAmount,
    snoise(vec3(t * 10.0 + 100.0, noiseTime, aOffset)) * uNoiseAmount,
    snoise(vec3(t * 10.0 + 200.0, noiseTime, aOffset)) * uNoiseAmount * 0.5
  );

  // Calculate opacity - fade at start and end
  float fadeIn = smoothstep(0.0, 0.1, t);
  float fadeOut = smoothstep(1.0, 0.8, t);
  vOpacity = fadeIn * fadeOut;

  // Point size varies with progress (trails)
  float trailFade = 1.0 - t * 0.5;
  float sizeVariation = 0.7 + snoise(vec3(aOffset * 50.0, t * 5.0, uTime)) * 0.3;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uPointSize * trailFade * sizeVariation * (300.0 / -mvPosition.z);
}
`;

const flowParticleFragmentShader = /* glsl */ `
${pactwiseColorsGLSL}

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uGlowStrength;

varying float vProgress;
varying float vOpacity;

void main() {
  // Soft circular point
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  // Soft falloff
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
  alpha *= vOpacity;

  // Color gradient along progress
  vec3 color = mix(uColor1, uColor2, vProgress);

  // Core glow
  float core = 1.0 - smoothstep(0.0, 0.2, dist);
  color += core * HIGHLIGHT * uGlowStrength;

  // Outer glow
  float glow = exp(-dist * 4.0) * uGlowStrength;
  color += glow * uColor2;

  gl_FragColor = vec4(color, alpha);
}
`;

// Flow particle material
const FlowParticleMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uFlowSpeed: 0.15,
    uNoiseAmount: 0.3,
    uPointSize: 4.0,
    uColor1: new THREE.Color('#c388bb'),
    uColor2: new THREE.Color('#dab5d5'),
    uGlowStrength: 0.5,
  },
  flowParticleVertexShader,
  flowParticleFragmentShader
);

extend({ FlowParticleMaterial: FlowParticleMaterialImpl });

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      flowParticleMaterial: {
        ref?: React.Ref<THREE.ShaderMaterial>;
        uTime?: number;
        uFlowSpeed?: number;
        uNoiseAmount?: number;
        uPointSize?: number;
        uColor1?: THREE.Color;
        uColor2?: THREE.Color;
        uGlowStrength?: number;
        transparent?: boolean;
        depthWrite?: boolean;
        blending?: THREE.Blending;
      };
    }
  }
}

/**
 * EnergyFlowStream Component
 * Flowing particles between two points
 */
interface EnergyFlowStreamProps {
  startPos: [number, number, number];
  endPos: [number, number, number];
  particleCount?: number;
  flowSpeed?: number;
  color1?: string;
  color2?: string;
  pointSize?: number;
}

export const EnergyFlowStream: React.FC<EnergyFlowStreamProps> = ({
  startPos,
  endPos,
  particleCount = 100,
  flowSpeed = 0.15,
  color1 = '#c388bb',
  color2 = '#dab5d5',
  pointSize = 4.0,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const pointsRef = useRef<THREE.Points>(null);

  // Generate particle attributes
  const { positions, progress, offsets, speeds, startPositions, endPositions } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const progress = new Float32Array(particleCount);
    const offsets = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);
    const startPositions = new Float32Array(particleCount * 3);
    const endPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Initial position (will be calculated in shader)
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // Progress along path (0-1)
      progress[i] = Math.random();

      // Random offset for variation
      offsets[i] = Math.random();

      // Speed variation
      speeds[i] = 0.5 + Math.random() * 1.0;

      // Start and end positions
      startPositions[i * 3] = startPos[0];
      startPositions[i * 3 + 1] = startPos[1];
      startPositions[i * 3 + 2] = startPos[2];

      endPositions[i * 3] = endPos[0];
      endPositions[i * 3 + 1] = endPos[1];
      endPositions[i * 3 + 2] = endPos[2];
    }

    return { positions, progress, offsets, speeds, startPositions, endPositions };
  }, [particleCount, startPos, endPos]);

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
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aProgress"
          args={[progress, 1]}
        />
        <bufferAttribute
          attach="attributes-aOffset"
          args={[offsets, 1]}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          args={[speeds, 1]}
        />
        <bufferAttribute
          attach="attributes-aStartPos"
          args={[startPositions, 3]}
        />
        <bufferAttribute
          attach="attributes-aEndPos"
          args={[endPositions, 3]}
        />
      </bufferGeometry>
      {/* @ts-expect-error - Custom Three.js shader material */}
      <flowParticleMaterial
        ref={materialRef}
        uFlowSpeed={flowSpeed}
        uPointSize={pointSize}
        uColor1={colors.color1}
        uColor2={colors.color2}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/**
 * DataStreamPortalEffect Component
 * Multiple flowing streams creating a portal effect
 */
interface DataStreamPortalEffectProps {
  position?: [number, number, number];
  radius?: number;
  streamCount?: number;
  particlesPerStream?: number;
  flowIntensity?: number;
}

export const DataStreamPortalEffect: React.FC<DataStreamPortalEffectProps> = ({
  position = [0, 0, 0],
  radius = 3,
  streamCount = 8,
  particlesPerStream = 80,
  flowIntensity = 1,
}) => {
  // Generate stream configurations
  const streams = useMemo(() => {
    const result = [];
    for (let i = 0; i < streamCount; i++) {
      const angle = (i / streamCount) * Math.PI * 2;
      const startRadius = radius * 2 + Math.random() * 2;
      const startAngle = angle + (Math.random() - 0.5) * 0.5;

      result.push({
        startPos: [
          Math.cos(startAngle) * startRadius,
          (Math.random() - 0.5) * 4,
          15 + Math.random() * 5,
        ] as [number, number, number],
        endPos: [
          Math.cos(angle) * 0.5,
          (Math.random() - 0.5) * 0.5,
          -2,
        ] as [number, number, number],
        color1: i % 2 === 0 ? '#c388bb' : '#9e829c',
        color2: i % 2 === 0 ? '#dab5d5' : '#c388bb',
      });
    }
    return result;
  }, [radius, streamCount]);

  return (
    <group position={position}>
      {streams.map((stream, i) => (
        <EnergyFlowStream
          key={i}
          startPos={stream.startPos}
          endPos={stream.endPos}
          particleCount={particlesPerStream}
          flowSpeed={0.1 * flowIntensity}
          color1={stream.color1}
          color2={stream.color2}
          pointSize={3}
        />
      ))}
    </group>
  );
};

/**
 * ConnectionBeam Component
 * Energy beam connection between nodes
 */
interface ConnectionBeamProps {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  width?: number;
  pulseSpeed?: number;
}

const beamVertexShader = /* glsl */ `
varying vec2 vUv;
varying float vProgress;

void main() {
  vUv = uv;
  vProgress = position.x * 0.5 + 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const beamFragmentShader = /* glsl */ `
${pactwiseColorsGLSL}

uniform float uTime;
uniform vec3 uColor;
uniform float uPulseSpeed;

varying vec2 vUv;
varying float vProgress;

void main() {
  // Pulsing energy wave
  float wave = sin(vProgress * 20.0 - uTime * uPulseSpeed) * 0.5 + 0.5;
  wave = pow(wave, 4.0);

  // Core brightness (center of beam)
  float core = exp(-abs(vUv.y - 0.5) * 20.0);

  // Edge glow
  float edgeGlow = exp(-abs(vUv.y - 0.5) * 5.0) * 0.3;

  vec3 color = uColor;
  color *= 1.0 + wave * 0.5;

  // Add highlight on wave peaks
  color += wave * HIGHLIGHT * 0.3;

  float alpha = (0.3 + wave * 0.7) * (core + edgeGlow);

  gl_FragColor = vec4(color, alpha);
}
`;

const BeamMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#9e829c'),
    uPulseSpeed: 3.0,
  },
  beamVertexShader,
  beamFragmentShader
);

extend({ BeamMaterial: BeamMaterialImpl });

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      beamMaterial: {
        ref?: React.Ref<THREE.ShaderMaterial>;
        uTime?: number;
        uColor?: THREE.Color;
        uPulseSpeed?: number;
        transparent?: boolean;
        side?: THREE.Side;
        depthWrite?: boolean;
        blending?: THREE.Blending;
      };
    }
  }
}

export const ConnectionBeam: React.FC<ConnectionBeamProps> = ({
  start,
  end,
  color = '#9e829c',
  width = 0.05,
  pulseSpeed = 3.0,
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Calculate beam geometry
  const { geometry, position, rotation } = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const length = startVec.distanceTo(endVec);
    const midpoint = startVec.clone().add(endVec).multiplyScalar(0.5);

    // Create plane geometry along X axis
    const geo = new THREE.PlaneGeometry(length, width, 32, 1);

    // Calculate rotation to align with endpoints
    const direction = endVec.clone().sub(startVec).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      geometry: geo,
      position: midpoint.toArray() as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
    };
  }, [start, end, width]);

  const colorUniform = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={rotation}>
      <primitive object={geometry} attach="geometry" />
      {/* @ts-expect-error - Custom Three.js shader material */}
      <beamMaterial
        ref={materialRef}
        uColor={colorUniform}
        uPulseSpeed={pulseSpeed}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export default EnergyFlowStream;
