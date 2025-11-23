"use client";

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Float } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { DitherEffect } from '../../effects/DitherEffect';
import { AgentNode, Connections, ParticleFlow, DataLandscape } from '../../components/animated/SceneComponents';

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

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  color: string;
}

const AGENTS: Agent[] = [
  { id: '1', name: 'Contract Analyst', role: 'Analysis', description: 'Extracts meta-data instantly', color: COLORS.highlight },
  { id: '2', name: 'Vendor Intel', role: 'Intelligence', description: 'Predicts vendor risk', color: COLORS.primary },
  { id: '3', name: 'Legal Ops', role: 'Operations', description: 'Automates workflow routing', color: COLORS.bloom },
  { id: '4', name: 'Compliance', role: 'Guardian', description: 'Enforces regulatory frameworks', color: COLORS.white },
];

interface MainExperienceProps {
  scrollProgress?: number;
}

export const MainExperience: React.FC<MainExperienceProps> = ({ scrollProgress = 0 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.Group>(null);

  // Define agent positions for the hero scene
  const agentPositions: [number, number, number][] = [
    [-3, 1, 0],
    [3, 2, -2],
    [-1, -2, 2],
    [2, -1, 1],
  ];

  useFrame((state) => {
    const offset = scrollProgress;

    if (cameraRef.current) {
      // Camera Drift logic
      cameraRef.current.position.z = 10 - offset * 5;
      cameraRef.current.position.y = offset * -2;
      cameraRef.current.rotation.x = offset * 0.2;
    }

    if (groupRef.current) {
      // Rotate the entire world slowly
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05 + (offset * Math.PI);
    }
  });

  return (
    <>
      <color attach="background" args={[COLORS.deep]} />

      {/* Lighting */}
      <ambientLight intensity={0.5} color={THREE_COLORS.primary} />
      <pointLight position={[10, 10, 10]} intensity={1} color={THREE_COLORS.highlight} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color={THREE_COLORS.bloom} />

      {/* Moving Camera Group to simulate specialized camera moves */}
      <group ref={cameraRef}>
        {/* We leave the actual camera alone and move the scene or a wrapper */}
      </group>

      <group ref={groupRef}>
        {/* Global Particles */}
        <ParticleFlow count={400} />

        {/* Stars Background */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* Hero Section Elements */}
        <group name="HeroAgents">
          {AGENTS.map((agent, i) => (
            <AgentNode
              key={agent.id}
              position={agentPositions[i]}
              color={agent.color}
              label={agent.name}
            />
          ))}
          <Connections positions={agentPositions} />
        </group>

        {/* Features Landscape - Positioned lower */}
        <group position={[0, -5, 0]}>
          <DataLandscape />
          {/* Floating cubes representing blocks of data */}
          <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
            <mesh position={[-4, 2, -2]}>
              <boxGeometry args={[1, 4, 1]} />
              <meshStandardMaterial color={THREE_COLORS.primary} wireframe />
            </mesh>
            <mesh position={[4, 1, 1]}>
              <boxGeometry args={[1, 3, 1]} />
              <meshStandardMaterial color={THREE_COLORS.highlight} wireframe />
            </mesh>
          </Float>
        </group>

        {/* Convergence / CTA Core */}
        <group position={[0, -15, 0]}>
          <mesh>
            <torusKnotGeometry args={[2, 0.6, 128, 32]} />
            <meshStandardMaterial
              color={THREE_COLORS.bloom}
              emissive={THREE_COLORS.primary}
              emissiveIntensity={2}
              wireframe={false}
            />
          </mesh>
          <ParticleFlow count={800} radius={8} speed={0.5} />
        </group>
      </group>

      {/* Post Processing Stack */}
      <EffectComposer disableNormalPass>
        {/* 1. Bloom for the glow */}
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          height={300}
          intensity={1.5}
        />
        {/* 2. Noise for texture */}
        <Noise opacity={0.05} />
        {/* 3. Vignette for focus */}
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
        {/* 4. Custom Dither - The key aesthetic driver */}
        <DitherEffect />
      </EffectComposer>
    </>
  );
};
