"use client";

import { Stars, Float } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

// Refined color palette - less purple, more professional white/soft glow
const COLORS = {
  background: '#0a0a0f',      // Near-black with slight warmth
  primary: '#e8e4ec',         // Soft white with hint of warmth
  secondary: '#a8a4b0',       // Muted gray-lavender
  accent: '#c4b8c8',          // Gentle pink-gray
  glow: '#d4ccd8',            // Soft glow color
  highlight: '#f0eef2',       // Almost white
};

export interface MainExperienceProps {
  scrollProgress?: number;
}

/**
 * Main 3D Experience - Elegant Space Aesthetic
 *
 * Clean, professional ambient background with:
 * - Subtle star field
 * - Floating ambient particles
 * - Smooth camera movement based on scroll
 * - Elegant bloom effects
 */
export const MainExperience: React.FC<MainExperienceProps> = ({
  scrollProgress = 0,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Smooth camera movement based on scroll
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Subtle camera drift
    camera.position.x = Math.sin(t * 0.1) * 0.3;
    camera.position.y = Math.cos(t * 0.08) * 0.2 + scrollProgress * -2;

    // Zoom out slightly as user scrolls
    camera.position.z = 12 - scrollProgress * 3;

    // Gentle rotation
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.02 + scrollProgress * Math.PI * 0.5;
    }
  });

  return (
    <>
      {/* Deep background */}
      <color attach="background" args={[COLORS.background]} />

      {/* Ambient lighting - soft and professional */}
      <ambientLight intensity={0.3} color={COLORS.primary} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color={COLORS.highlight} />
      <pointLight position={[-10, -5, -10]} intensity={0.3} color={COLORS.accent} />

      <group ref={groupRef}>
        {/* Star field - subtle and professional */}
        <Stars
          radius={100}
          depth={50}
          count={3000}
          factor={3}
          saturation={0.1}
          fade
          speed={0.5}
        />

        {/* Floating ambient particles - clean and minimal */}
        <AmbientParticles count={150} scrollProgress={scrollProgress} />

        {/* Soft glowing orbs at strategic positions */}
        <GlowingOrbs scrollProgress={scrollProgress} />

        {/* Subtle grid lines in the distance */}
        <SubtleGrid scrollProgress={scrollProgress} />
      </group>

      {/* Post-processing - subtle and refined */}
      {/* @ts-expect-error - EffectComposer types are incomplete */}
      <EffectComposer disableNormalPass>
        <Bloom
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
          height={200}
          intensity={0.4}
        />
        <Vignette eskil={false} offset={0.2} darkness={0.5} />
      </EffectComposer>
    </>
  );
};

/**
 * Ambient floating particles - clean, minimal
 */
interface AmbientParticlesProps {
  count: number;
  scrollProgress: number;
}

const AmbientParticles: React.FC<AmbientParticlesProps> = ({ count, scrollProgress: _scrollProgress }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      speeds[i] = 0.1 + Math.random() * 0.3;
    }

    return { positions, speeds };
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const t = state.clock.getElapsedTime();
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const speed = particles.speeds[i];

      // Gentle floating motion
      positions[i3 + 1] += Math.sin(t * speed + i) * 0.002;

      // Subtle drift
      positions[i3] += Math.cos(t * speed * 0.5 + i * 0.1) * 0.001;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={COLORS.primary}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

/**
 * Soft glowing orbs - elegant accent elements
 */
interface GlowingOrbsProps {
  scrollProgress: number;
}

const GlowingOrbs: React.FC<GlowingOrbsProps> = ({ scrollProgress }) => {
  const orbs = useMemo(() => [
    { position: [-8, 4, -15] as [number, number, number], scale: 2, color: COLORS.glow },
    { position: [10, -3, -20] as [number, number, number], scale: 2.5, color: COLORS.accent },
    { position: [-5, -6, -25] as [number, number, number], scale: 3, color: COLORS.secondary },
    { position: [7, 5, -18] as [number, number, number], scale: 1.5, color: COLORS.highlight },
  ], []);

  return (
    <group>
      {orbs.map((orb, i) => (
        <Float
          key={i}
          speed={0.5}
          rotationIntensity={0}
          floatIntensity={0.5}
        >
          <mesh position={orb.position}>
            <sphereGeometry args={[orb.scale, 32, 32]} />
            <meshBasicMaterial
              color={orb.color}
              transparent
              opacity={0.08 - scrollProgress * 0.02}
              depthWrite={false}
            />
          </mesh>
          {/* Inner glow */}
          <mesh position={orb.position}>
            <sphereGeometry args={[orb.scale * 0.6, 16, 16]} />
            <meshBasicMaterial
              color={COLORS.highlight}
              transparent
              opacity={0.15 - scrollProgress * 0.03}
              depthWrite={false}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
};

/**
 * Subtle grid lines - professional tech aesthetic
 */
interface SubtleGridProps {
  scrollProgress: number;
}

const SubtleGrid: React.FC<SubtleGridProps> = ({ scrollProgress }) => {
  const gridRef = useRef<THREE.Group>(null);

  const gridLines = useMemo(() => {
    const lines: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];
    const size = 30;
    const divisions = 15;
    const step = size / divisions;

    // Horizontal lines
    for (let i = -divisions / 2; i <= divisions / 2; i++) {
      lines.push({
        start: new THREE.Vector3(-size / 2, i * step, -30),
        end: new THREE.Vector3(size / 2, i * step, -30),
      });
    }

    // Vertical lines
    for (let i = -divisions / 2; i <= divisions / 2; i++) {
      lines.push({
        start: new THREE.Vector3(i * step, -size / 2, -30),
        end: new THREE.Vector3(i * step, size / 2, -30),
      });
    }

    return lines;
  }, []);

  useFrame((_state) => {
    if (gridRef.current) {
      gridRef.current.position.z = -30 + scrollProgress * 10;
      const material = gridRef.current.children[0] as THREE.Line;
      if (material.material) {
        (material.material as THREE.LineBasicMaterial).opacity = 0.08 * (1 - scrollProgress);
      }
    }
  });

  return (
    <group ref={gridRef}>
      {gridLines.map((line, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([
                line.start.x, line.start.y, line.start.z,
                line.end.x, line.end.y, line.end.z,
              ]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={COLORS.secondary}
            transparent
            opacity={0.08}
            depthWrite={false}
          />
        </line>
      ))}
    </group>
  );
};

export default MainExperience;
