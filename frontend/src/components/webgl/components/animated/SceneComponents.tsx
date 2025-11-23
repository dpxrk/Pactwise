"use client";

import React, { useRef, useMemo, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useInteraction } from '@/contexts/InteractionContext';
import {
  AnalystShape,
  IntelShape,
  LegalShape,
  GuardianShape
} from './SpecializedAgentShapes';

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
  id: string;
}

export const AgentNode: React.FC<AgentNodeProps> = ({ position, color, label, id }) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  const { activeAgentId, setActiveAgentId, scrollToAgent } = useInteraction();

  // Is this specific agent active?
  const isActive = activeAgentId === id;
  // Is any agent active?
  const isAnyActive = activeAgentId !== null;
  // Should this agent fade out because another one is active?
  const isDimmed = isAnyActive && !isActive;

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();

      // Floating animation - more pronounced when active
      const floatIntensity = isActive ? 0.3 : 0.2;
      ref.current.position.y = THREE.MathUtils.lerp(
        ref.current.position.y,
        position[1] + Math.sin(t + position[0]) * floatIntensity,
        0.1
      );

      // Scale effect - MORE dimming for inactive agents (0.6 instead of 0.8)
      const targetScale = isActive ? 1.5 : (hovered ? 1.2 : (isDimmed ? 0.6 : 1.0));
      ref.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      );
    }
  });

  // Click handler to toggle agent selection and scroll to AI Constellation section
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Toggle: if clicking the active agent, deactivate it
    if (isActive) {
      setActiveAgentId(null);
    } else {
      setActiveAgentId(id);
      // Scroll to the AI Constellation section
      if (scrollToAgent) {
        scrollToAgent(id);
      }
    }
  };

  // Render specialized shape based on agent ID
  const renderShape = () => {
    switch (id) {
      case '1':
        return <AnalystShape color={color} active={isActive || hovered} />;
      case '2':
        return <IntelShape color={color} active={isActive || hovered} />;
      case '3':
        return <LegalShape color={color} active={isActive || hovered} />;
      case '4':
        return <GuardianShape color={color} active={isActive || hovered} />;
      default:
        // Fallback to default shape
        return (
          <>
            <mesh>
              <icosahedronGeometry args={[1, 1]} />
              <meshBasicMaterial color={color} wireframe transparent opacity={0.3} />
            </mesh>
            <mesh>
              <octahedronGeometry args={[0.5, 0]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={2}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>
          </>
        );
    }
  };

  return (
    <group
      ref={ref}
      position={position}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = 'default';
      }}
    >
      {renderShape()}

      {/* Glow Halo */}
      <mesh position={[0, 0, -0.5]} scale={[2, 2, 2]}>
        <planeGeometry />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isActive ? 0.3 : (isDimmed ? 0.05 : 0.1)}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
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
      color: THREE_COLORS.primary,
      wireframe: true,
      emissive: THREE_COLORS.highlight,
      emissiveIntensity: 0.8,
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
