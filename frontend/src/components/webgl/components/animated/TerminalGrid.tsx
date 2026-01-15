"use client";

import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

const COLORS = {
  deep: '#291528',
  primary: '#9e829c',
  highlight: '#dab5d5',
  white: '#f0eff4',
  grid: '#3d2a3c',
  accent: '#c388bb',
};

interface TerminalGridProps {
  scrollProgress?: number;
  gridSize?: number;
  divisions?: number;
}

/**
 * Bloomberg-style terminal grid background
 * Creates a perspective grid with subtle animation and data visualization aesthetics
 */
export const TerminalGrid: React.FC<TerminalGridProps> = ({
  scrollProgress = 0,
  gridSize = 40,
  divisions = 40,
}) => {
  const gridRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.Group>(null);

  // Create main grid lines
  const gridLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    const step = gridSize / divisions;
    const halfSize = gridSize / 2;

    // Horizontal lines (along X axis)
    for (let i = 0; i <= divisions; i++) {
      const z = -halfSize + i * step;
      lines.push([
        new THREE.Vector3(-halfSize, 0, z),
        new THREE.Vector3(halfSize, 0, z),
      ]);
    }

    // Vertical lines (along Z axis)
    for (let i = 0; i <= divisions; i++) {
      const x = -halfSize + i * step;
      lines.push([
        new THREE.Vector3(x, 0, -halfSize),
        new THREE.Vector3(x, 0, halfSize),
      ]);
    }

    return lines;
  }, [gridSize, divisions]);

  // Animate grid based on scroll
  useFrame((state) => {
    if (gridRef.current) {
      const t = state.clock.getElapsedTime();

      // Subtle breathing animation
      gridRef.current.position.y = -8 + Math.sin(t * 0.3) * 0.2;

      // Rotate based on scroll progress
      gridRef.current.rotation.x = -Math.PI / 2.5 + scrollProgress * 0.1;
    }
  });

  return (
    <group ref={gridRef} position={[0, -8, 0]}>
      {/* Main grid */}
      <group ref={linesRef}>
        {gridLines.map((points, i) => (
          <Line
            key={i}
            points={points}
            color={COLORS.grid}
            lineWidth={0.5}
            transparent
            opacity={0.3 + (i % 5 === 0 ? 0.2 : 0)}
          />
        ))}
      </group>

      {/* Center axis highlight */}
      <Line
        points={[
          new THREE.Vector3(-gridSize / 2, 0.01, 0),
          new THREE.Vector3(gridSize / 2, 0.01, 0),
        ]}
        color={COLORS.primary}
        lineWidth={1}
        transparent
        opacity={0.5}
      />
      <Line
        points={[
          new THREE.Vector3(0, 0.01, -gridSize / 2),
          new THREE.Vector3(0, 0.01, gridSize / 2),
        ]}
        color={COLORS.primary}
        lineWidth={1}
        transparent
        opacity={0.5}
      />
    </group>
  );
};

interface DataStreamProps {
  count?: number;
  scrollProgress?: number;
}

/**
 * Flowing data particles that move along the grid
 * Creates a sense of data being processed
 */
export const DataStream: React.FC<DataStreamProps> = ({
  count = 100,
  scrollProgress: _scrollProgress = 0,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize particle data
  const particles = useMemo(() => {
    const temp: Array<{
      x: number;
      z: number;
      speed: number;
      offset: number;
      lane: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      // Create particles in lanes (like data moving through pipelines)
      const lane = Math.floor(Math.random() * 20) - 10;
      temp.push({
        x: lane * 2,
        z: Math.random() * 40 - 20,
        speed: 0.5 + Math.random() * 1.5,
        offset: Math.random() * Math.PI * 2,
        lane,
      });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();

    particles.forEach((particle, i) => {
      // Move particles along Z axis (forward motion)
      const z = ((t * particle.speed + particle.offset * 10) % 40) - 20;

      // Add wave motion
      const wave = Math.sin(t * 2 + particle.offset) * 0.1;

      dummy.position.set(
        particle.x + wave,
        -7.5 + Math.sin(t + particle.offset) * 0.1,
        z
      );

      // Scale based on position (perspective effect)
      const scale = 0.3 + (z + 20) / 40 * 0.3;
      dummy.scale.set(scale, scale, scale);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.1, 0.02, 0.3]} />
      <meshBasicMaterial
        color={COLORS.highlight}
        transparent
        opacity={0.6}
      />
    </instancedMesh>
  );
};

interface PulseRingProps {
  position?: [number, number, number];
  color?: string;
  maxRadius?: number;
  duration?: number;
}

/**
 * Expanding pulse ring effect for data visualization
 */
export const PulseRing: React.FC<PulseRingProps> = ({
  position = [0, -7.5, 0],
  color = COLORS.accent,
  maxRadius = 15,
  duration = 4,
}) => {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current) return;
    const t = state.clock.getElapsedTime();

    // Calculate pulse phase (0 to 1)
    const phase = (t % duration) / duration;

    // Expand radius
    const radius = phase * maxRadius;
    ringRef.current.scale.set(radius, radius, 1);

    // Fade out as it expands
    const material = ringRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = (1 - phase) * 0.3;
  });

  return (
    <mesh ref={ringRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.98, 1, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

interface VerticalBarChartProps {
  position?: [number, number, number];
  barCount?: number;
  maxHeight?: number;
}

/**
 * Animated vertical bar chart visualization
 * Represents data processing activity
 */
export const VerticalBarChart: React.FC<VerticalBarChartProps> = ({
  position = [-15, -7, 10],
  barCount = 12,
  maxHeight = 3,
}) => {
  const barsRef = useRef<THREE.Group>(null);
  const barRefs = useRef<THREE.Mesh[]>([]);

  // Initialize bar values
  const barData = useMemo(() => {
    return Array(barCount).fill(0).map(() => ({
      baseValue: 0.3 + Math.random() * 0.7,
      frequency: 0.5 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [barCount]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    barRefs.current.forEach((bar, i) => {
      if (!bar) return;
      const data = barData[i];

      // Animate height with slight variation
      const height = data.baseValue * maxHeight *
        (0.8 + Math.sin(t * data.frequency + data.phase) * 0.2);

      bar.scale.y = height;
      bar.position.y = height / 2;
    });
  });

  return (
    <group ref={barsRef} position={position}>
      {barData.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) barRefs.current[i] = el; }}
          position={[i * 0.6, 0, 0]}
        >
          <boxGeometry args={[0.4, 1, 0.4]} />
          <meshBasicMaterial
            color={i % 3 === 0 ? COLORS.accent : COLORS.primary}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Complete terminal background scene
 * Combines grid, data streams, and visualization elements
 */
export const TerminalBackground: React.FC<{ scrollProgress?: number }> = ({
  scrollProgress = 0,
}) => {
  return (
    <group>
      <TerminalGrid scrollProgress={scrollProgress} />
      <DataStream count={80} scrollProgress={scrollProgress} />
      <PulseRing />
      <PulseRing position={[10, -7.5, -5]} duration={5} />
      <PulseRing position={[-8, -7.5, 8]} duration={6} />
      <VerticalBarChart />
      <VerticalBarChart position={[12, -7, -8]} barCount={8} />
    </group>
  );
};

export default TerminalBackground;
