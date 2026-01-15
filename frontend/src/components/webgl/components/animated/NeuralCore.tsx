"use client";

import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

const COLORS = {
  deep: '#291528',
  primary: '#9e829c',
  highlight: '#dab5d5',
  white: '#f0eff4',
  bloom: '#c388bb',
};

interface NeuralCoreProps {
  scrollProgress: number;
  position?: [number, number, number];
  scale?: number;
}

// Inner pulsing core
const CoreCenter: React.FC<{ pulseIntensity: number }> = ({ pulseIntensity }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      // Pulsing scale
      const pulse = 1 + Math.sin(t * 2) * 0.1 * pulseIntensity;
      meshRef.current.scale.setScalar(pulse);

      // Gentle rotation
      meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.2;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <dodecahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial
        color={COLORS.bloom}
        emissive={COLORS.highlight}
        emissiveIntensity={0.8 + pulseIntensity * 0.5}
        roughness={0.1}
        metalness={0.9}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
};

// Orbiting luminous rings
const OrbitRing: React.FC<{
  radius: number;
  axis: 'x' | 'y' | 'z' | 'diagonal';
  speed: number;
  offset: number;
  opacity: number;
}> = ({ radius, axis, speed, offset, opacity }) => {
  const ringRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ringRef.current) {
      const t = state.clock.getElapsedTime() * speed + offset;

      switch (axis) {
        case 'x':
          ringRef.current.rotation.x = t;
          break;
        case 'y':
          ringRef.current.rotation.y = t;
          break;
        case 'z':
          ringRef.current.rotation.z = t;
          break;
        case 'diagonal':
          ringRef.current.rotation.x = t * 0.7;
          ringRef.current.rotation.z = t * 0.5;
          break;
      }
    }
  });

  return (
    <group ref={ringRef}>
      <mesh>
        <torusGeometry args={[radius, 0.02, 8, 64]} />
        <meshStandardMaterial
          color={COLORS.white}
          emissive={COLORS.highlight}
          emissiveIntensity={0.5}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* Small nodes on the ring */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius,
          ]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            color={COLORS.bloom}
            emissive={COLORS.bloom}
            emissiveIntensity={1}
          />
        </mesh>
      ))}
    </group>
  );
};

// Particle emission burst on awakening
const CoreParticles: React.FC<{ intensity: number }> = ({ intensity }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const count = 100;
    const pos = new Float32Array(count * 3);
    const vel: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      // Start from center
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      // Random outward velocity
      vel.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      ));
    }

    return { positions: pos, velocities: vel };
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const posAttr = pointsRef.current.geometry.attributes.position;
    const t = state.clock.getElapsedTime();

    for (let i = 0; i < velocities.length; i++) {
      // Cyclic particle animation - particles move out then reset
      const cycle = (t * 0.5 + i * 0.1) % 3;

      if (cycle < 2) {
        posAttr.setXYZ(
          i,
          velocities[i].x * cycle * 10 * intensity,
          velocities[i].y * cycle * 10 * intensity,
          velocities[i].z * cycle * 10 * intensity
        );
      } else {
        // Reset to center
        posAttr.setXYZ(i, 0, 0, 0);
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={COLORS.highlight}
        transparent
        opacity={0.6 * intensity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// Outer ethereal shell
const EtherealShell: React.FC<{ expanded: boolean }> = ({ expanded }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      // Breathing effect
      const targetScale = expanded ? 2.5 : 2;
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.02
      );
      meshRef.current.rotation.y = t * 0.1;
      meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        color={COLORS.primary}
        wireframe
        transparent
        opacity={0.2}
        emissive={COLORS.primary}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
};

export const NeuralCore: React.FC<NeuralCoreProps> = ({
  scrollProgress,
  position = [0, 0, 0],
  scale = 1,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Calculate state based on scroll
  const _isAwakening = scrollProgress < 0.1;
  const isExpanding = scrollProgress >= 0.1 && scrollProgress < 0.2;
  const isMinimized = scrollProgress >= 0.2;

  // Pulse intensity decreases as we scroll past hero
  const pulseIntensity = Math.max(0.3, 1 - scrollProgress * 2);

  // Core moves to top-left corner as user scrolls
  useFrame(() => {
    if (groupRef.current) {
      let targetX = position[0];
      let targetY = position[1];
      let targetScale = scale;

      if (isMinimized) {
        // Move to top-left corner
        targetX = -6;
        targetY = 4;
        targetScale = 0.4;
      } else if (isExpanding) {
        // Slight expansion before minimizing
        targetScale = 1.2;
      }

      groupRef.current.position.lerp(
        new THREE.Vector3(targetX, targetY, position[2]),
        0.03
      );
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.03
      );
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Inner pulsing core */}
      <CoreCenter pulseIntensity={pulseIntensity} />

      {/* Multiple orbiting rings at different angles */}
      <OrbitRing
        radius={1.5}
        axis="y"
        speed={0.5}
        offset={0}
        opacity={0.7}
      />
      <OrbitRing
        radius={1.8}
        axis="x"
        speed={0.3}
        offset={Math.PI / 4}
        opacity={0.5}
      />
      <OrbitRing
        radius={2.1}
        axis="diagonal"
        speed={0.4}
        offset={Math.PI / 2}
        opacity={0.4}
      />
      <OrbitRing
        radius={2.4}
        axis="z"
        speed={0.25}
        offset={Math.PI}
        opacity={0.3}
      />

      {/* Particle emission from core */}
      <CoreParticles intensity={pulseIntensity} />

      {/* Ethereal outer shell */}
      <EtherealShell expanded={isExpanding} />

      {/* Point light at center */}
      <pointLight
        color={COLORS.bloom}
        intensity={2 * pulseIntensity}
        distance={10}
        decay={2}
      />
    </group>
  );
};

export default NeuralCore;
