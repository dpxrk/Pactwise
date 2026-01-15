/**
 * Hero Scene: AI Agent Network
 *
 * Main hero section featuring 4 AI agent nodes connected by flowing particles
 * Demonstrates the interconnected intelligence of Pactwise's AI system
 */

'use client';

import React from 'react';
import * as THREE from 'three';

import { AIAgentNode, createAgentNetworkLayout, AgentType } from '../components/AIAgentNode';
import { createAgentConnections } from '../components/ConnectionLine';
import {
  WebGLCanvas,
  SceneBuilderParams,
} from '../components/WebGLCanvas';
import {
  createParticleFlowMaterial,
  createParticleFlowGeometry,
} from '../shaders/particleFlow';
import { SCENE_COLORS } from '../utils/color-utils';

/**
 * Hero Agent Network Props
 */
export interface HeroAgentNetworkProps {
  className?: string;
}

/**
 * Hero Agent Network Component
 */
export const HeroAgentNetwork: React.FC<HeroAgentNetworkProps> = ({ className = '' }) => {
  /**
   * Build the hero scene
   */
  const buildScene = ({ scene, camera, mouse, clock: _clock }: SceneBuilderParams) => {
    // Adjust camera position for hero shot
    camera.position.set(0, 2, 15);
    camera.lookAt(0, 0, 0);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(SCENE_COLORS.atmosphere, 0.4);
    scene.add(ambientLight);

    // Add directional light for depth
    const directionalLight = new THREE.DirectionalLight(SCENE_COLORS.highlight, 0.6);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create agent network layout
    const agentLayout = createAgentNetworkLayout();

    // Create AI agent nodes
    const agents: Record<AgentType, AIAgentNode> = {
      contractAnalyst: new AIAgentNode({
        type: 'contractAnalyst',
        position: agentLayout.contractAnalyst,
      }),
      vendorIntelligence: new AIAgentNode({
        type: 'vendorIntelligence',
        position: agentLayout.vendorIntelligence,
      }),
      legalOperations: new AIAgentNode({
        type: 'legalOperations',
        position: agentLayout.legalOperations,
      }),
      complianceGuardian: new AIAgentNode({
        type: 'complianceGuardian',
        position: agentLayout.complianceGuardian,
      }),
    };

    // Add agents to scene
    Object.values(agents).forEach((agent) => agent.addToScene(scene));

    // Create connection lines
    const agentPositions = Object.fromEntries(
      Object.entries(agents).map(([key, agent]) => [key, agent.getPosition()])
    );
    const connections = createAgentConnections(agentPositions, true);

    // Add connections to scene
    connections.forEach((connection) => connection.addToScene(scene));

    // Create particle flow systems between agents
    const particleSystems: THREE.Points[] = [];
    const agentTypes = Object.keys(agents) as AgentType[];

    for (let i = 0; i < agentTypes.length; i++) {
      for (let j = i + 1; j < agentTypes.length; j++) {
        const startAgent = agents[agentTypes[i]];
        const endAgent = agents[agentTypes[j]];

        const start = startAgent.getPosition();
        const end = endAgent.getPosition();
        const control = new THREE.Vector3(
          (start.x + end.x) / 2,
          (start.y + end.y) / 2 + 1,
          (start.z + end.z) / 2
        );

        const geometry = createParticleFlowGeometry(300); // 300 particles per connection
        const material = createParticleFlowMaterial(start, control, end, 300, 3.0);

        const particles = new THREE.Points(geometry, material);
        particles.userData = {
          material, // Store reference for updates
        };
        scene.add(particles);
        particleSystems.push(particles);
      }
    }

    // Add starfield background
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 100;
      starPositions[i + 1] = (Math.random() - 0.5) * 100;
      starPositions[i + 2] = (Math.random() - 0.5) * 100;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starMaterial = new THREE.PointsMaterial({
      color: SCENE_COLORS.highlight,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Camera initial position for drift animation
    const cameraInitialPos = camera.position.clone();
    let cameraTime = 0;

    // Return lifecycle object with update and cleanup
    return {
      update: (deltaTime: number, elapsedTime: number) => {
        // Update agents
        Object.values(agents).forEach((agent) => agent.update(deltaTime));

        // Update connections
        connections.forEach((connection) => connection.update(deltaTime));

        // Update particle systems
        particleSystems.forEach((particles) => {
          const material = particles.userData.material as THREE.ShaderMaterial;
          if (material.uniforms.uTime) {
            material.uniforms.uTime.value = elapsedTime;
          }
        });

        // Rotate starfield slowly
        stars.rotation.y += deltaTime * 0.02;

        // Camera drift - slow circular orbit
        cameraTime += deltaTime * 0.1;
        const driftRadius = 1.5;
        camera.position.x = cameraInitialPos.x + Math.sin(cameraTime) * driftRadius;
        camera.position.z = cameraInitialPos.z + Math.cos(cameraTime) * driftRadius * 0.5;

        // Mouse parallax effect
        const parallaxX = mouse.x * 2;
        const parallaxY = mouse.y * 2;

        camera.position.x += (parallaxX - camera.position.x + cameraInitialPos.x) * 0.05;
        camera.position.y += (parallaxY - camera.position.y + cameraInitialPos.y) * 0.05;

        camera.lookAt(0, 0, 0);
      },

      cleanup: () => {
        Object.values(agents).forEach((agent) => agent.dispose());
        connections.forEach((connection) => connection.dispose());
        particleSystems.forEach((particles) => {
          particles.geometry.dispose();
          (particles.material as THREE.Material).dispose();
        });
        starGeometry.dispose();
        starMaterial.dispose();
      },
    };
  };

  return (
    <div className={`relative ${className}`}>
      <WebGLCanvas
        buildScene={buildScene}
        enablePostProcessing={true}
        enableDithering={true}
        enableBloom={true}
        camera={{
          fov: 60,
          near: 0.1,
          far: 100,
          position: [0, 2, 15],
        }}
        backgroundColor={0x1a0d18} // Purple 950
        enableMouseTracking={true}
        className="w-full h-screen"
        loadingComponent={
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-purple-300">Loading AI Network...</div>
          </div>
        }
        fallbackComponent={
          <div className="flex items-center justify-center h-screen bg-purple-950">
            <div className="text-center text-purple-300">
              <h2 className="text-2xl font-bold mb-4">AI Agent Network</h2>
              <p>Your browser doesn&apos;t support WebGL visualization.</p>
            </div>
          </div>
        }
      />

      {/* Overlay content - Typography */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-center max-w-4xl px-6">
          <h1 className="text-6xl md:text-7xl font-bold text-ghost-100 mb-6 tracking-tight">
            <span style={{ fontWeight: 400 }}>I</span>
            <span style={{ fontWeight: 300 }}>ntelligent</span>{' '}
            <span style={{ fontWeight: 200 }}>Systems</span>
            <br />
            <span style={{ fontWeight: 400 }}>T</span>
            <span style={{ fontWeight: 300 }}>hat</span>{' '}
            <span style={{ fontWeight: 200 }}>Transform</span>{' '}
            <span style={{ fontWeight: 400 }}>C</span>
            <span style={{ fontWeight: 300 }}>ontracts</span>
          </h1>

          <p className="text-xl text-purple-300 mb-8 max-w-2xl mx-auto">
            Pactwise empowers legal and procurement professionals to evolve from reviewers to
            strategists
          </p>

          {/* Bloomberg-style metrics overlay */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 font-mono text-sm">
            <div className="bg-purple-950/50 border border-purple-500/30 p-4">
              <div className="text-purple-300">Contracts Processed</div>
              <div className="text-2xl text-ghost-100 font-bold">2.5M+</div>
            </div>
            <div className="bg-purple-950/50 border border-purple-500/30 p-4">
              <div className="text-purple-300">Time Saved</div>
              <div className="text-2xl text-ghost-100 font-bold">87%</div>
            </div>
            <div className="bg-purple-950/50 border border-purple-500/30 p-4">
              <div className="text-purple-300">Cost Reduction</div>
              <div className="text-2xl text-ghost-100 font-bold">$18M</div>
            </div>
            <div className="bg-purple-950/50 border border-purple-500/30 p-4">
              <div className="text-purple-300">Accuracy</div>
              <div className="text-2xl text-ghost-100 font-bold">99.7%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroAgentNetwork;
