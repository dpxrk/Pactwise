
import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing';
import { DitherEffect } from '../CustomEffects';
import { AgentNode, Connections, ParticleFlow, DataLandscape } from './SceneComponents';
import { AGENTS, THREE_COLORS, COLORS } from '../../constants';
import { useInteraction } from '../../InteractionContext';

export const MainExperience = () => {
  const scroll = useScroll();
  const groupRef = useRef<THREE.Group>(null);
  const { mouse } = useThree();
  const { activeAgentId } = useInteraction();
  
  // Define agent positions for the hero scene
  const agentPositions: [number, number, number][] = [
    [-3, 1, 0],   // Analyst
    [3, 2, -2],   // Intel
    [-1, -2, 2],  // Legal
    [2, -1, 1],   // Guardian
  ];

  useFrame((state) => {
    const offset = scroll.offset;
    const mx = mouse.x * 0.5;
    const my = mouse.y * 0.5;
    const camera = state.camera;

    // --- GLOBAL ROTATION LOGIC ---
    // Only rotate the world if we are NOT inspecting an agent.
    // This prevents the "wandering" effect where the object moves away while we try to look at it.
    if (groupRef.current && !activeAgentId) {
        const baseRotation = state.clock.getElapsedTime() * 0.05 + (offset * Math.PI * 0.5);
        groupRef.current.rotation.y = baseRotation;
    }

    if (activeAgentId && groupRef.current) {
        // --- ACTIVE STATE: FOCUS ON AGENT ---
        
        // 1. Identify Target Agent
        const agentIndex = AGENTS.findIndex(a => a.id === activeAgentId);
        
        if (agentIndex !== -1) {
            // 2. Calculate World Position
            // We must account for the group's rotation to know exactly where the agent is in 3D space.
            const localPos = new THREE.Vector3(...agentPositions[agentIndex]);
            const worldPos = localPos.clone().applyMatrix4(groupRef.current.matrixWorld);

            // 3. Determine Focus Point (Framing)
            // The Modal is on the RIGHT. We want the Agent on the LEFT.
            // So we look at a point to the RIGHT of the agent.
            // This shifts the viewport so the agent sits comfortably on the left side.
            const focusOffset = new THREE.Vector3(2.5, 0, 0); // Shift focus right
            const focusPoint = worldPos.clone().add(focusOffset);

            // 4. Determine Camera Position
            // Position camera relative to the focus point
            const targetCamPos = new THREE.Vector3(
                focusPoint.x, 
                focusPoint.y + 0.5,  // Slight look down
                focusPoint.z + 6.0   // Distance from focus point
            );

            // 5. Smoothly Move Camera
            // Increased lerp speed (0.08) for snappier zoom
            camera.position.lerp(targetCamPos, 0.08);
            
            // 6. Look At Focus Point
            camera.lookAt(focusPoint);
        }

    } else {
        // --- IDLE/SCROLL STATE ---

        // 1. Calculate Target Camera Transform based on Scroll
        const targetZ = 10 - offset * 5;
        const targetY = (offset * -2) + (my * 0.5);
        const targetX = (mx * 0.5);
        
        // 2. Apply Scroll & Mouse Parallax to Position
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);
        
        // 3. Apply Rotation (Reset lookAt)
        // We manually calculate rotation to simulate a "dolly" or "crane" shot
        const targetRotX = (offset * 0.2) - (my * 0.05);
        const targetRotY = (mx * 0.05);
        
        // Smoothly return rotation to scroll-based values
        camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotX, 0.05);
        camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotY, 0.05);
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, 0.05); // Level out
    }
  });

  return (
    <>
      <color attach="background" args={[COLORS.deep]} />
      
      {/* Cinematic Lighting */}
      <ambientLight intensity={0.2} color={THREE_COLORS.primary} />
      <spotLight position={[10, 20, 10]} angle={0.5} penumbra={1} intensity={2} color={THREE_COLORS.highlight} />
      <pointLight position={[-10, -5, -10]} intensity={1} color={THREE_COLORS.bloom} />
      <pointLight position={[0, -10, 0]} intensity={0.5} color={THREE_COLORS.white} />

      <group ref={groupRef}>
        {/* Global Particles */}
        <ParticleFlow count={600} speed={0.05} />
        
        {/* Stars Background */}
        <Stars radius={120} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

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
        <group position={[0, -6, 0]}>
             <DataLandscape />
             {/* Abstract Data Structures floating above grid */}
             <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                <mesh position={[-5, 2, -3]}>
                    <boxGeometry args={[0.5, 8, 0.5]} />
                    <meshStandardMaterial color={THREE_COLORS.primary} transparent opacity={0.5} />
                </mesh>
                <mesh position={[6, 3, 2]}>
                     <cylinderGeometry args={[0.2, 0.2, 6]} />
                     <meshStandardMaterial color={THREE_COLORS.highlight} transparent opacity={0.5} />
                </mesh>
             </Float>
        </group>
        
        {/* Convergence / CTA Core */}
        <group position={[0, -18, 0]}>
            <mesh>
                <torusKnotGeometry args={[1.5, 0.4, 200, 32]} />
                <meshStandardMaterial 
                    color={THREE_COLORS.bloom} 
                    emissive={THREE_COLORS.primary}
                    emissiveIntensity={1}
                    roughness={0.1}
                    metalness={0.9}
                />
            </mesh>
             <ParticleFlow count={1000} radius={6} speed={0.8} />
        </group>
      </group>

      {/* High-End Post Processing Stack */}
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <Bloom 
            luminanceThreshold={0.1} 
            luminanceSmoothing={0.8} 
            height={300} 
            intensity={1.2} 
        />
        <ChromaticAberration 
            offset={new THREE.Vector2(0.002, 0.002)} 
            radialModulation={false}
            modulationOffset={0}
        />
        <Noise opacity={0.08} />
        <Vignette eskil={false} offset={0.1} darkness={1.0} />
        <DitherEffect />
      </EffectComposer>
    </>
  );
};
