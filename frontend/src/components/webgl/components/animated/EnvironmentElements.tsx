"use client";

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ProceduralBackground,
  InfiniteGrid,
  AmbientParticleField,
} from '@/lib/shaders/materials/EnvironmentMaterial';

// Pactwise color palette
const COLORS = {
  deepPurple: '#291528',
  warmPurple: '#4a2545',
  primary: '#9e829c',
  highlight: '#dab5d5',
  accent: '#c388bb',
  white: '#f0eff4',
  grid: '#3d2a3c',
};

interface EnvironmentElementsProps {
  scrollProgress?: number;
}

/**
 * Digital Ecosystem Environment
 * Using custom procedural shaders for atmosphere
 */
export const EnvironmentElements: React.FC<EnvironmentElementsProps> = ({
  scrollProgress = 0,
}) => {
  return (
    <group>
      {/* Procedural gradient background with animated noise */}
      <ProceduralBackground scrollProgress={scrollProgress} />

      {/* Fog for depth atmosphere */}
      <fog attach="fog" args={[COLORS.deepPurple, 20, 50]} />

      {/* Ambient lighting */}
      <ambientLight intensity={0.4} color={COLORS.primary} />

      {/* Key lights for the ecosystem */}
      <pointLight
        position={[10, 10, 10]}
        intensity={0.6}
        color={COLORS.highlight}
        distance={50}
      />
      <pointLight
        position={[-10, 5, -10]}
        intensity={0.4}
        color={COLORS.warmPurple}
        distance={40}
      />
      <pointLight
        position={[0, -5, 0]}
        intensity={0.3}
        color={COLORS.accent}
        distance={30}
      />

      {/* Procedural infinite grid */}
      <InfiniteGrid
        position={[0, -5, 0]}
        size={80}
        gridSize={2}
        color={COLORS.primary}
        opacity={0.3}
      />

      {/* Ambient floating particles */}
      <AmbientParticleField
        count={400}
        spread={[50, 25, 50]}
        color={COLORS.highlight}
        pointSize={2.5}
      />

      {/* Pulse rings emanating from center */}
      <PulseRings />

      {/* Vertical data pillars with glow */}
      <DataPillars scrollProgress={scrollProgress} />

      {/* Atmospheric depth particles */}
      <DepthParticles />
    </group>
  );
};

/**
 * Expanding pulse rings - data signals spreading through the ecosystem
 */
const PulseRings: React.FC = () => {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const duration = 8;
    const maxRadius = 25;

    [ring1Ref, ring2Ref, ring3Ref].forEach((ref, i) => {
      if (!ref.current) return;
      const offset = i * (duration / 3);
      const phase = ((t + offset) % duration) / duration;
      const radius = phase * maxRadius;

      ref.current.scale.set(radius, radius, 1);
      const material = ref.current.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - phase) * 0.12;
    });
  });

  return (
    <group position={[0, -4.9, 0]}>
      <mesh ref={ring1Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 1, 64]} />
        <meshBasicMaterial
          color={COLORS.accent}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 1, 64]} />
        <meshBasicMaterial
          color={COLORS.primary}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={ring3Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95, 1, 64]} />
        <meshBasicMaterial
          color={COLORS.highlight}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

/**
 * Vertical data pillars - architectural elements showing data flow
 */
const DataPillars: React.FC<{ scrollProgress: number }> = () => {
  const pillarsRef = useRef<THREE.Group>(null);

  // Define pillar positions around the perimeter
  const pillarPositions: [number, number, number][] = useMemo(() => [
    [-15, 0, -10],
    [15, 0, -10],
    [-15, 0, 10],
    [15, 0, 10],
    [-10, 0, -15],
    [10, 0, -15],
    [0, 0, -18],
    [-18, 0, 0],
    [18, 0, 0],
  ], []);

  useFrame((state) => {
    if (!pillarsRef.current) return;
    const t = state.clock.getElapsedTime();

    pillarsRef.current.children.forEach((group, i) => {
      const children = (group as THREE.Group).children;
      children.forEach((child, j) => {
        if (child.type === 'Mesh') {
          const mesh = child as THREE.Mesh;
          // Subtle height pulse
          mesh.scale.y = 1 + Math.sin(t * 0.5 + i * 0.5) * 0.08;

          // Glow pulse
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.opacity = 0.15 + Math.sin(t * 2 + i + j) * 0.05;
          }
        }
      });
    });
  });

  return (
    <group ref={pillarsRef}>
      {pillarPositions.map((pos, i) => (
        <group key={i} position={pos}>
          {/* Core pillar */}
          <mesh>
            <boxGeometry args={[0.08, 25, 0.08]} />
            <meshBasicMaterial
              color={COLORS.primary}
              transparent
              opacity={0.2}
            />
          </mesh>

          {/* Glow layer */}
          <mesh>
            <boxGeometry args={[0.15, 25, 0.15]} />
            <meshBasicMaterial
              color={COLORS.highlight}
              transparent
              opacity={0.08}
              depthWrite={false}
            />
          </mesh>

          {/* Energy node at top */}
          <mesh position={[0, 12.5, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial
              color={COLORS.accent}
              transparent
              opacity={0.6}
            />
          </mesh>

          {/* Energy node at bottom */}
          <mesh position={[0, -12.5, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial
              color={COLORS.primary}
              transparent
              opacity={0.4}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/**
 * Depth particles - particles that fade with distance for atmosphere
 */
const DepthParticles: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const count = 150;
    return Array(count).fill(0).map(() => ({
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 30,
      z: -20 - Math.random() * 30, // Behind the scene
      size: 0.05 + Math.random() * 0.1,
      speed: 0.1 + Math.random() * 0.3,
      offset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();

    particles.forEach((p, i) => {
      // Gentle drift
      const x = p.x + Math.sin(t * p.speed + p.offset) * 0.5;
      const y = p.y + Math.cos(t * p.speed * 0.5 + p.offset) * 0.3;

      dummy.position.set(x, y, p.z);

      // Size pulsing
      const scale = p.size * (1 + Math.sin(t + p.offset) * 0.2);
      dummy.scale.setScalar(scale);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color={COLORS.highlight}
        transparent
        opacity={0.15}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

export default EnvironmentElements;
