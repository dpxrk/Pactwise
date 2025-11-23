"use client";

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

const COLORS = {
  deep: '#291528',
  primary: '#9e829c',
  highlight: '#dab5d5',
  white: '#f0eff4',
  bloom: '#c388bb'
};

const THREE_COLORS = {
  deep: new THREE.Color(COLORS.deep),
  primary: new THREE.Color(COLORS.primary),
  highlight: new THREE.Color(COLORS.highlight),
  white: new THREE.Color(COLORS.white),
  bloom: new THREE.Color(COLORS.bloom),
};

// --- Particle Flow ---
interface ParticleFlowProps {
  count?: number;
  radius?: number;
  speed?: number;
}

export const ParticleFlow: React.FC<ParticleFlowProps> = ({ count = 200, radius = 5, speed = 0.1 }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initial positions
  const particles = useMemo(() => {
    const temp: Array<{
      t: number;
      speedFactor: number;
      xFactor: number;
      yFactor: number;
      zFactor: number;
    }> = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const speedFactor = 0.01 + Math.random() * 0.04;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;
      temp.push({ t, speedFactor, xFactor, yFactor, zFactor });
    }
    return temp;
  }, [count]);

  useFrame(() => {
    if (!mesh.current) return;

    particles.forEach((particle, i) => {
      particle.t += particle.speedFactor * speed;
      const t = particle.t;

      const s = Math.cos(t);

      // Lissajous-ish movement
      dummy.position.set(
        (particle.xFactor + Math.cos(t) * radius) + Math.sin(t * 2) * 2,
        (particle.yFactor + Math.sin(t) * radius) + Math.cos(t * 1.5) * 2,
        (particle.zFactor + Math.cos(t / 2) * radius) + Math.sin(t * 2) * 5
      );

      dummy.scale.set(s, s, s);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();

      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[0.05, 0]} />
      <meshBasicMaterial color={THREE_COLORS.highlight} transparent opacity={0.8} />
    </instancedMesh>
  );
};

// --- Agent Node ---
interface AgentNodeProps {
  position: [number, number, number];
  color: string;
  label?: string;
}

export const AgentNode: React.FC<AgentNodeProps> = ({ position, color, label }) => {
  const ref = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current && outerRef.current && innerRef.current) {
      const t = state.clock.getElapsedTime();
      // Floating animation
      ref.current.position.y = position[1] + Math.sin(t + position[0]) * 0.2;

      // Rotation
      outerRef.current.rotation.x = t * 0.2;
      outerRef.current.rotation.y = t * 0.3;

      innerRef.current.rotation.x = -t * 0.4;
      innerRef.current.rotation.z = t * 0.1;
    }
  });

  return (
    <group ref={ref} position={position}>
      {/* Outer Wireframe */}
      <mesh ref={outerRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.3} />
      </mesh>

      {/* Inner Solid */}
      <mesh ref={innerRef}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Glow Halo (Billboard) */}
      <mesh position={[0, 0, 0]} scale={[1.5, 1.5, 1.5]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
    </group>
  );
};

// --- Connection Lines ---
interface ConnectionsProps {
  positions: [number, number, number][];
}

export const Connections: React.FC<ConnectionsProps> = ({ positions }) => {
  // Create lines between all nodes
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        pts.push(new THREE.Vector3(...positions[i]));
        pts.push(new THREE.Vector3(...positions[j]));
      }
    }
    return pts;
  }, [positions]);

  return (
    <Line
      points={points}
      color={COLORS.primary}
      opacity={0.15}
      transparent
      lineWidth={1}
    />
  );
};

// --- Data Landscape (Terrain) ---
export const DataLandscape: React.FC = () => {
  const mesh = useRef<THREE.Mesh>(null);

  // Create height data
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(30, 30, 64, 64);

    // Custom Grid Material
    const mat = new THREE.MeshStandardMaterial({
      color: THREE_COLORS.deep,
      wireframe: true,
      emissive: THREE_COLORS.primary,
      emissiveIntensity: 0.5,
      roughness: 0,
      metalness: 1
    });

    return { geometry: geo, material: mat };
  }, []);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    const positions = mesh.current.geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      // We want to animate the Z (height) based on X and Y
      const height = Math.sin(x * 0.5 + t) * Math.cos(y * 0.5 + t) * 1.5;

      positions.setZ(i, height);
    }
    positions.needsUpdate = true;
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -4, 0]}
    />
  );
};
