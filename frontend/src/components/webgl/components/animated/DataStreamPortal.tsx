"use client";

import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

import { DataStreamPortalEffect, EnergyFlowStream } from '@/lib/shaders/materials/EnergyFlowMaterial';

// Pactwise color palette
const COLORS = {
  deepPurple: '#291528',
  warmPurple: '#4a2545',
  primary: '#9e829c',
  highlight: '#dab5d5',
  accent: '#c388bb',
  white: '#f0eff4',
};

interface DataStreamPortalProps {
  position?: [number, number, number];
  active?: boolean;
  flowIntensity?: number;
}

/**
 * Data Stream Portal - Contract Entry Visualization
 * Using custom GPU particle shaders for flowing data streams
 */
export const DataStreamPortal: React.FC<DataStreamPortalProps> = ({
  position = [0, 0, 0],
  active = true,
  flowIntensity = 1,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle breathing animation
      const t = state.clock.getElapsedTime();
      groupRef.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02);
    }
  });

  if (!active) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Portal Frame with custom shader glow */}
      <PortalFrame />

      {/* GPU-based flowing particles */}
      <DataStreamPortalEffect
        radius={2.5}
        streamCount={12}
        particlesPerStream={100}
        flowIntensity={flowIntensity}
      />

      {/* Document fragments entering */}
      <DocumentFragments flowIntensity={flowIntensity} />

      {/* Portal glow effect */}
      <PortalGlow />

      {/* Additional converging streams */}
      <ConvergingStreams flowIntensity={flowIntensity} />
    </group>
  );
};

/**
 * Portal Frame - Elegant archway with animated glow
 */
const PortalFrame: React.FC = () => {
  const frameRef = useRef<THREE.Group>(null);
  const glowRingsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (frameRef.current) {
      // Subtle rotation oscillation
      frameRef.current.rotation.y = Math.sin(t * 0.2) * 0.05;
    }

    if (glowRingsRef.current) {
      // Animated ring rotation
      glowRingsRef.current.rotation.z = t * 0.1;
    }
  });

  // Create arch shape using curve
  const archPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 48;
    const height = 4;
    const width = 2.5;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = Math.PI * t;
      const x = Math.cos(angle) * width;
      const y = Math.sin(angle) * height * 0.7 - 0.5;
      points.push(new THREE.Vector3(x, y, 0));
    }

    return points;
  }, []);

  // Create tube geometry from arch curve
  const archCurve = useMemo(() => {
    return new THREE.CatmullRomCurve3(archPoints);
  }, [archPoints]);

  return (
    <group ref={frameRef}>
      {/* Main arch - using tube geometry for thickness */}
      <mesh>
        <tubeGeometry args={[archCurve, 48, 0.05, 8, false]} />
        <meshBasicMaterial color={COLORS.highlight} transparent opacity={0.8} />
      </mesh>

      {/* Inner arch */}
      <mesh scale={[0.9, 0.9, 1]}>
        <tubeGeometry args={[archCurve, 48, 0.03, 8, false]} />
        <meshBasicMaterial color={COLORS.primary} transparent opacity={0.5} />
      </mesh>

      {/* Animated glow rings */}
      <group ref={glowRingsRef} position={[0, 1, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
            <torusGeometry args={[2.8 + i * 0.15, 0.02, 8, 64, Math.PI]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? COLORS.accent : COLORS.highlight}
              transparent
              opacity={0.3 - i * 0.08}
            />
          </mesh>
        ))}
      </group>

      {/* Vertical pillars */}
      <mesh position={[-2.5, -2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 3, 8]} />
        <meshBasicMaterial color={COLORS.highlight} transparent opacity={0.6} />
      </mesh>
      <mesh position={[2.5, -2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 3, 8]} />
        <meshBasicMaterial color={COLORS.highlight} transparent opacity={0.6} />
      </mesh>

      {/* Base connection */}
      <mesh position={[0, -3.5, 0]}>
        <boxGeometry args={[5.2, 0.08, 0.08]} />
        <meshBasicMaterial color={COLORS.primary} transparent opacity={0.5} />
      </mesh>

      {/* Corner decorations */}
      {[[-2.5, -3.5, 0], [2.5, -3.5, 0]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <octahedronGeometry args={[0.15, 0]} />
          <meshBasicMaterial color={COLORS.accent} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Document Fragments - Contracts transforming into data
 */
interface ParticlesProps {
  flowIntensity: number;
}

const DocumentFragments: React.FC<ParticlesProps> = ({ flowIntensity }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const documents = useMemo(() => {
    return Array(12).fill(0).map((_, i) => ({
      x: (Math.random() - 0.5) * 3,
      y: (Math.random() - 0.5) * 4 - 1,
      z: 8 + i * 1.5,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      speed: 0.012 + Math.random() * 0.008,
      scale: 0.8 + Math.random() * 0.4,
    }));
  }, []);

  const docsRef = useRef(documents);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();

    docsRef.current.forEach((doc, i) => {
      // Move towards portal
      doc.z -= doc.speed * flowIntensity * 60;

      // Reset when passed through
      if (doc.z < -3) {
        doc.z = 18 + Math.random() * 5;
        doc.x = (Math.random() - 0.5) * 3;
        doc.y = (Math.random() - 0.5) * 4 - 1;
      }

      // Converge and transform
      const progress = Math.max(0, (18 - doc.z) / 18);
      const convergeFactor = Math.pow(progress, 2);

      const posX = doc.x * (1 - convergeFactor * 0.9);
      const posY = doc.y * (1 - convergeFactor * 0.7);

      dummy.position.set(posX, posY, doc.z);

      // Rotate and shrink as approaching portal
      dummy.rotation.x = t * doc.rotationSpeed * 5;
      dummy.rotation.y = t * doc.rotationSpeed * 3;
      dummy.rotation.z = progress * Math.PI * 2;

      // Scale down and eventually disappear
      const scale = Math.max(0.05, doc.scale * (1 - convergeFactor * 0.95));
      dummy.scale.set(scale, scale * 1.3, 0.02);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, documents.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color={COLORS.white}
        transparent
        opacity={0.5}
      />
    </instancedMesh>
  );
};

/**
 * Portal Glow - Ambient glow effect around the portal
 */
const PortalGlow: React.FC = () => {
  const glowRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.08 + Math.sin(t * 2) * 0.03;
    }

    if (innerGlowRef.current) {
      const material = innerGlowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.12 + Math.sin(t * 3) * 0.04;
    }

    if (coreRef.current) {
      const scale = 1 + Math.sin(t * 4) * 0.1;
      coreRef.current.scale.setScalar(scale);
    }
  });

  return (
    <>
      {/* Outer glow */}
      <mesh ref={glowRef} position={[0, 0, -0.5]}>
        <planeGeometry args={[7, 9]} />
        <meshBasicMaterial
          color={COLORS.accent}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Inner bright glow */}
      <mesh ref={innerGlowRef} position={[0, 0, -0.3]}>
        <planeGeometry args={[4, 6]} />
        <meshBasicMaterial
          color={COLORS.highlight}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Central pulsing core */}
      <mesh ref={coreRef} position={[0, -0.5, -0.1]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial
          color={COLORS.white}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      {/* Energy ring */}
      <mesh position={[0, 0, -0.2]} rotation={[0, 0, 0]}>
        <ringGeometry args={[3.5, 3.6, 64]} />
        <meshBasicMaterial
          color={COLORS.accent}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
};

/**
 * Additional converging streams from different angles
 */
const ConvergingStreams: React.FC<ParticlesProps> = ({ flowIntensity }) => {
  const streams = useMemo(() => [
    { start: [-8, 3, 12] as [number, number, number], end: [0, 0, 0] as [number, number, number], color1: '#c388bb', color2: '#dab5d5' },
    { start: [8, 2, 14] as [number, number, number], end: [0, 0, 0] as [number, number, number], color1: '#9e829c', color2: '#c388bb' },
    { start: [-5, -3, 10] as [number, number, number], end: [0, -0.5, 0] as [number, number, number], color1: '#dab5d5', color2: '#f0eff4' },
    { start: [6, -2, 11] as [number, number, number], end: [0, -0.5, 0] as [number, number, number], color1: '#c388bb', color2: '#9e829c' },
  ], []);

  return (
    <group>
      {streams.map((stream, i) => (
        <EnergyFlowStream
          key={i}
          startPos={stream.start}
          endPos={stream.end}
          particleCount={60}
          flowSpeed={0.08 * flowIntensity}
          color1={stream.color1}
          color2={stream.color2}
          pointSize={2.5}
        />
      ))}
    </group>
  );
};

export default DataStreamPortal;
