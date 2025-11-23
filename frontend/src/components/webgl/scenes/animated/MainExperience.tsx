"use client";

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars, Float } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { DitherEffect } from '../../effects/DitherEffect';
import { AgentNode, Connections, ParticleFlow, DataLandscape } from '../../components/animated/SceneComponents';
import { useInteraction } from '@/contexts/InteractionContext';

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
  const { camera } = useThree();
  const { activeAgentId } = useInteraction();

  // Define agent positions for the hero scene
  const agentPositions: [number, number, number][] = [
    [-3, 1, 0],
    [3, 2, -2],
    [-1, -2, 2],
    [2, -1, 1],
  ];

  useFrame((state) => {
    const offset = scrollProgress;

    // Camera focus system
    if (activeAgentId) {
      // Find the active agent's position
      const agentIndex = AGENTS.findIndex((agent) => agent.id === activeAgentId);
      if (agentIndex !== -1) {
        const targetPosition = agentPositions[agentIndex];

        // Calculate camera position to focus on agent - CLOSER zoom (5 instead of 8)
        const focusDistance = 5;
        const targetCameraPosition = new THREE.Vector3(
          targetPosition[0],
          targetPosition[1],
          targetPosition[2] + focusDistance
        );

        // Smooth lerp to target position
        camera.position.lerp(targetCameraPosition, 0.05);

        // Look at the agent
        const targetLookAt = new THREE.Vector3(...targetPosition);
        const currentLookAt = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion)
          .add(camera.position);
        currentLookAt.lerp(targetLookAt, 0.05);
        camera.lookAt(currentLookAt);
      }
    } else {
      // Default scroll-based camera movement when no agent is active
      if (cameraRef.current) {
        // Camera Drift logic
        cameraRef.current.position.z = 10 - offset * 5;
        cameraRef.current.position.y = offset * -2;
        cameraRef.current.rotation.x = offset * 0.2;
      }

      // Reset camera to default position smoothly
      const defaultPosition = new THREE.Vector3(0, 0, 10 - offset * 5);
      camera.position.lerp(defaultPosition, 0.02);

      // Reset camera rotation
      const defaultRotation = new THREE.Euler(offset * 0.2, 0, 0);
      camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, defaultRotation.x, 0.02);
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
              id={agent.id}
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
