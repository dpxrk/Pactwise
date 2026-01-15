"use client";

import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

const COLORS = {
  primary: '#9e829c',    // Mountbatten pink
  accent: '#dab5d5',     // Light purple
  deep: '#291528',       // Deep purple
  highlight: '#c388bb',  // Bloom purple
};

interface FloatingShapeProps {
  position: [number, number, number];
  scale?: number;
  rotationSpeed?: number;
  floatSpeed?: number;
  floatAmplitude?: number;
  color?: string;
  opacity?: number;
}

/**
 * Subtle floating abstract shape - torus knot or sphere
 */
const FloatingShape: React.FC<FloatingShapeProps> = ({
  position,
  scale = 1,
  rotationSpeed = 0.001,
  floatSpeed = 0.3,
  floatAmplitude = 0.3,
  color = COLORS.primary,
  opacity = 0.15,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const initialY = position[1];

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();

      // Very slow rotation
      meshRef.current.rotation.x += rotationSpeed;
      meshRef.current.rotation.y += rotationSpeed * 0.7;

      // Gentle floating motion
      meshRef.current.position.y = initialY + Math.sin(t * floatSpeed) * floatAmplitude;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <torusKnotGeometry args={[1, 0.3, 100, 16]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
};

interface GradientSphereProps {
  position: [number, number, number];
  scale?: number;
  color?: string;
  opacity?: number;
}

/**
 * Soft gradient sphere for ambient glow effect
 */
const GradientSphere: React.FC<GradientSphereProps> = ({
  position,
  scale = 3,
  color = COLORS.accent,
  opacity = 0.08,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      // Very subtle pulsing
      const pulse = 1 + Math.sin(t * 0.5) * 0.05;
      meshRef.current.scale.setScalar(scale * pulse);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
};

interface FlowingRibbonProps {
  points: THREE.Vector3[];
  color?: string;
  opacity?: number;
  width?: number;
}

/**
 * Flowing ribbon/curve for elegant visual effect
 */
const FlowingRibbon: React.FC<FlowingRibbonProps> = ({
  points,
  color = COLORS.highlight,
  opacity = 0.2,
  width = 0.5,
}) => {
  const tubeRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 64, width, 8, false);
  }, [points, width]);

  useFrame((state) => {
    if (tubeRef.current) {
      const t = state.clock.getElapsedTime();
      tubeRef.current.rotation.y = t * 0.02;
    }
  });

  return (
    <mesh ref={tubeRef} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.6}
        metalness={0.3}
      />
    </mesh>
  );
};

interface AmbientBackgroundProps {
  variant?: 'hero' | 'section' | 'minimal';
  intensity?: number;
}

/**
 * Subtle ambient 3D background for enterprise landing page
 * Designed to enhance premium feel without distracting from content
 */
export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({
  variant = 'hero',
  intensity = 1,
}) => {
  // Create flowing ribbon points
  const ribbonPoints = useMemo(() => [
    new THREE.Vector3(-8, 2, -5),
    new THREE.Vector3(-4, 0, -3),
    new THREE.Vector3(0, 2, -4),
    new THREE.Vector3(4, -1, -3),
    new THREE.Vector3(8, 1, -5),
  ], []);

  const ribbonPoints2 = useMemo(() => [
    new THREE.Vector3(6, -2, -6),
    new THREE.Vector3(2, 0, -4),
    new THREE.Vector3(-2, -1, -5),
    new THREE.Vector3(-6, 1, -4),
  ], []);

  if (variant === 'minimal') {
    return (
      <>
        <ambientLight intensity={0.6} />
        <GradientSphere position={[5, 0, -10]} scale={4} opacity={0.05 * intensity} />
      </>
    );
  }

  return (
    <>
      {/* Soft lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.3} color={COLORS.accent} />
      <pointLight position={[-10, -5, 5]} intensity={0.2} color={COLORS.primary} />

      {/* Background gradient spheres for soft glow */}
      <GradientSphere
        position={[8, 2, -15]}
        scale={6}
        color={COLORS.accent}
        opacity={0.06 * intensity}
      />
      <GradientSphere
        position={[-6, -3, -12]}
        scale={5}
        color={COLORS.primary}
        opacity={0.05 * intensity}
      />

      {variant === 'hero' && (
        <>
          {/* Floating abstract shapes */}
          <FloatingShape
            position={[6, 1, -8]}
            scale={0.8}
            color={COLORS.primary}
            opacity={0.12 * intensity}
            rotationSpeed={0.002}
          />
          <FloatingShape
            position={[-5, -1, -10]}
            scale={0.6}
            color={COLORS.accent}
            opacity={0.1 * intensity}
            rotationSpeed={0.0015}
            floatSpeed={0.4}
          />

          {/* Flowing ribbons */}
          <FlowingRibbon
            points={ribbonPoints}
            color={COLORS.highlight}
            opacity={0.15 * intensity}
            width={0.3}
          />
          <FlowingRibbon
            points={ribbonPoints2}
            color={COLORS.primary}
            opacity={0.12 * intensity}
            width={0.25}
          />
        </>
      )}

      {variant === 'section' && (
        <>
          {/* Simpler version for other sections */}
          <FloatingShape
            position={[7, 0, -12]}
            scale={0.5}
            color={COLORS.accent}
            opacity={0.08 * intensity}
            rotationSpeed={0.001}
          />
        </>
      )}
    </>
  );
};

export default AmbientBackground;
