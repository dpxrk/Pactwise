"use client";

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

import { AbstractAgentCore, AgentGlowField } from '@/lib/shaders/materials/AbstractAgentMaterial';
import { ConnectionBeam } from '@/lib/shaders/materials/EnergyFlowMaterial';

// Pactwise color palette
const COLORS = {
  deepPurple: '#291528',
  warmPurple: '#4a2545',
  primary: '#9e829c',
  highlight: '#dab5d5',
  accent: '#c388bb',
  white: '#f0eff4',
};

// Agent type configurations
const AGENT_CONFIGS = {
  contractAnalyst: {
    color1: '#291528',
    color2: '#c388bb',
    noiseScale: 2.5,
    noiseStrength: 0.18,
    pulseSpeed: 1.8,
    glowIntensity: 0.6,
  },
  vendorIntelligence: {
    color1: '#4a2545',
    color2: '#9e829c',
    noiseScale: 2.0,
    noiseStrength: 0.15,
    pulseSpeed: 1.5,
    glowIntensity: 0.5,
  },
  legalOperations: {
    color1: '#291528',
    color2: '#dab5d5',
    noiseScale: 3.0,
    noiseStrength: 0.12,
    pulseSpeed: 2.0,
    glowIntensity: 0.55,
  },
  complianceGuardian: {
    color1: '#4a2545',
    color2: '#c388bb',
    noiseScale: 1.8,
    noiseStrength: 0.2,
    pulseSpeed: 1.2,
    glowIntensity: 0.7,
  },
};

interface AIAgentEntitiesProps {
  scrollProgress: number;
  visible?: boolean;
}

/**
 * AI Agent Entities - 4 distinct agents with custom shaders
 * Using AbstractAgentCore for organic, breathing visualizations
 */
export const AIAgentEntities: React.FC<AIAgentEntitiesProps> = ({
  scrollProgress,
  visible = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Calculate visibility based on scroll (agents appear between 15-75% scroll)
  const agentVisibility = useMemo(() => {
    if (scrollProgress < 0.15) return 0;
    if (scrollProgress < 0.25) return (scrollProgress - 0.15) / 0.1;
    if (scrollProgress < 0.6) return 1;
    if (scrollProgress < 0.75) return 1 - (scrollProgress - 0.6) / 0.15;
    return 0;
  }, [scrollProgress]);

  if (!visible || agentVisibility <= 0) return null;

  return (
    <group ref={groupRef} scale={[agentVisibility, agentVisibility, agentVisibility]}>
      {/* Contract Analyst Agent - positioned front-left */}
      <ContractAnalystAgent
        position={[-4, 1, -2]}
        scrollProgress={scrollProgress}
      />

      {/* Vendor Intelligence Agent - positioned front-right */}
      <VendorIntelligenceAgent
        position={[3, 0.5, -3]}
        scrollProgress={scrollProgress}
      />

      {/* Legal Operations Agent - positioned back-center */}
      <LegalOperationsAgent
        position={[0, 2, -6]}
        scrollProgress={scrollProgress}
      />

      {/* Compliance Guardian Agent - positioned elevated back */}
      <ComplianceGuardianAgent
        position={[-2, 3, -8]}
        scrollProgress={scrollProgress}
      />

      {/* Energy beam connections between agents */}
      <AgentConnections />
    </group>
  );
};

interface AgentProps {
  position: [number, number, number];
  scrollProgress: number;
}

/**
 * Contract Analyst Agent
 * Organic core with orbiting data fragments
 */
const ContractAnalystAgent: React.FC<AgentProps> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);
  const orbitRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      // Organic floating using noise-like motion
      groupRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.15 + Math.sin(t * 1.3) * 0.05;
      groupRef.current.position.x = position[0] + Math.sin(t * 0.5) * 0.05;
    }

    if (orbitRef.current) {
      // Orbiting documents
      orbitRef.current.rotation.y = t * 0.4;
      orbitRef.current.rotation.x = Math.sin(t * 0.3) * 0.15;
    }
  });

  const config = AGENT_CONFIGS.contractAnalyst;

  return (
    <group ref={groupRef} position={position}>
      {/* Main organic core */}
      <AbstractAgentCore
        scale={0.6}
        color1={config.color1}
        color2={config.color2}
        noiseScale={config.noiseScale}
        noiseStrength={config.noiseStrength}
        pulseSpeed={config.pulseSpeed}
        glowIntensity={config.glowIntensity}
        segments={48}
      />

      {/* Outer glow field */}
      <AgentGlowField scale={1.2} color={config.color2} opacity={0.12} />

      {/* Orbiting document fragments */}
      <group ref={orbitRef}>
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i / 5) * Math.PI * 2;
          const radius = 1.0;
          return (
            <OrbitingFragment
              key={i}
              angle={angle}
              radius={radius}
              index={i}
            />
          );
        })}
      </group>

      {/* Agent label */}
      <Text
        position={[0, -1, 0]}
        fontSize={0.12}
        color={COLORS.white}
        anchorX="center"
        anchorY="top"
      >
        Contract Analyst
      </Text>
    </group>
  );
};

/**
 * Vendor Intelligence Agent
 * Network-style core with connection tendrils
 */
const VendorIntelligenceAgent: React.FC<AgentProps> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Connection endpoint positions
  const connectionPoints: [number, number, number][] = useMemo(() => [
    [1.3, 0.4, 0],
    [-1.0, 0.2, 0.7],
    [0.7, -0.4, -0.9],
    [-0.4, 0.7, -1.0],
    [0.9, -0.2, 0.9],
  ], []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.7 + 1) * 0.12;
      groupRef.current.position.z = position[2] + Math.sin(t * 0.4) * 0.03;
    }
  });

  const config = AGENT_CONFIGS.vendorIntelligence;

  return (
    <group ref={groupRef} position={position}>
      {/* Main organic core */}
      <AbstractAgentCore
        scale={0.5}
        color1={config.color1}
        color2={config.color2}
        noiseScale={config.noiseScale}
        noiseStrength={config.noiseStrength}
        pulseSpeed={config.pulseSpeed}
        glowIntensity={config.glowIntensity}
        segments={40}
      />

      {/* Outer glow field */}
      <AgentGlowField scale={1.0} color={config.color2} opacity={0.1} />

      {/* Connection beams to vendor nodes */}
      {connectionPoints.map((point, i) => (
        <React.Fragment key={i}>
          <ConnectionBeam
            start={[0, 0, 0]}
            end={point}
            color={COLORS.primary}
            width={0.02}
            pulseSpeed={2 + i * 0.3}
          />
          {/* Endpoint node */}
          <mesh position={point}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshBasicMaterial color={COLORS.highlight} transparent opacity={0.8} />
          </mesh>
        </React.Fragment>
      ))}

      {/* Agent label */}
      <Text
        position={[0, -0.9, 0]}
        fontSize={0.12}
        color={COLORS.white}
        anchorX="center"
        anchorY="top"
      >
        Vendor Intelligence
      </Text>
    </group>
  );
};

/**
 * Legal Operations Agent
 * Geometric organization with flowing data
 */
const LegalOperationsAgent: React.FC<AgentProps> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.6 + 2) * 0.1;
    }

    if (ringsRef.current) {
      ringsRef.current.rotation.y = t * 0.15;
      ringsRef.current.rotation.x = Math.sin(t * 0.2) * 0.1;
    }
  });

  const config = AGENT_CONFIGS.legalOperations;

  return (
    <group ref={groupRef} position={position}>
      {/* Main organic core */}
      <AbstractAgentCore
        scale={0.55}
        color1={config.color1}
        color2={config.color2}
        noiseScale={config.noiseScale}
        noiseStrength={config.noiseStrength}
        pulseSpeed={config.pulseSpeed}
        glowIntensity={config.glowIntensity}
        segments={48}
      />

      {/* Organizational rings */}
      <group ref={ringsRef}>
        {[0.9, 1.1, 1.3].map((radius, i) => (
          <mesh key={i} rotation={[Math.PI / 2 + i * 0.2, 0, 0]}>
            <ringGeometry args={[radius - 0.02, radius, 64]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? COLORS.highlight : COLORS.accent}
              transparent
              opacity={0.3 - i * 0.08}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* Outer glow field */}
      <AgentGlowField scale={1.4} color={config.color2} opacity={0.08} />

      {/* Data flow particles */}
      <DataFlowParticles />

      {/* Agent label */}
      <Text
        position={[0, -1.1, 0]}
        fontSize={0.12}
        color={COLORS.white}
        anchorX="center"
        anchorY="top"
      >
        Legal Operations
      </Text>
    </group>
  );
};

/**
 * Compliance Guardian Agent
 * Protective shield with scanning effect
 */
const ComplianceGuardianAgent: React.FC<AgentProps> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);
  const scanRef = useRef<THREE.Mesh>(null);
  const shieldRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.5 + 3) * 0.15;
    }

    if (scanRef.current) {
      // Scanning animation
      const scanY = ((t * 0.5) % 1) * 2 - 1;
      scanRef.current.position.y = scanY * 0.8;
      const mat = scanRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.8 - Math.abs(scanY) * 0.3;
    }

    if (shieldRef.current) {
      shieldRef.current.rotation.y = Math.sin(t * 0.3) * 0.15;
    }
  });

  const config = AGENT_CONFIGS.complianceGuardian;

  return (
    <group ref={groupRef} position={position}>
      {/* Main organic core */}
      <AbstractAgentCore
        scale={0.65}
        color1={config.color1}
        color2={config.color2}
        noiseScale={config.noiseScale}
        noiseStrength={config.noiseStrength}
        pulseSpeed={config.pulseSpeed}
        glowIntensity={config.glowIntensity}
        segments={56}
      />

      {/* Shield-like protective rings */}
      <group ref={shieldRef}>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.9, 0.03, 8, 32, Math.PI * 1.5]} />
          <meshBasicMaterial color={COLORS.highlight} transparent opacity={0.5} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}>
          <torusGeometry args={[1.0, 0.02, 8, 32, Math.PI * 1.5]} />
          <meshBasicMaterial color={COLORS.accent} transparent opacity={0.4} />
        </mesh>
      </group>

      {/* Scanning line */}
      <mesh ref={scanRef}>
        <planeGeometry args={[1.8, 0.03]} />
        <meshBasicMaterial
          color={COLORS.accent}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer glow field */}
      <AgentGlowField scale={1.3} color={config.color2} opacity={0.1} />

      {/* Status indicator */}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#4ade80" />
      </mesh>

      {/* Agent label */}
      <Text
        position={[0, -1.2, 0]}
        fontSize={0.12}
        color={COLORS.white}
        anchorX="center"
        anchorY="top"
      >
        Compliance Guardian
      </Text>
    </group>
  );
};

/**
 * Orbiting document fragment
 */
interface OrbitingFragmentProps {
  angle: number;
  radius: number;
  index: number;
}

const OrbitingFragment: React.FC<OrbitingFragmentProps> = ({ angle, radius, index }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 + Math.sin(t * 2 + index) * 0.2;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[
        Math.cos(angle) * radius,
        Math.sin(index * 0.7) * 0.25,
        Math.sin(angle) * radius,
      ]}
      rotation={[0, -angle + Math.PI / 2, Math.sin(index) * 0.3]}
    >
      <planeGeometry args={[0.2, 0.28]} />
      <meshBasicMaterial
        color={COLORS.white}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * Data flow particles for Legal Operations agent
 */
const DataFlowParticles: React.FC = () => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const count = 40;
    return Array(count).fill(0).map(() => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.random() * Math.PI,
      speed: 0.3 + Math.random() * 0.5,
      radius: 0.8 + Math.random() * 0.4,
      size: 0.02 + Math.random() * 0.02,
    }));
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();

    particles.forEach((p, i) => {
      // Spiral inward motion
      const theta = p.theta + t * p.speed;
      const phi = p.phi + t * p.speed * 0.3;
      const radius = p.radius * (0.5 + Math.sin(t * 2 + i) * 0.5);

      dummy.position.set(
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.cos(phi) * radius * 0.5,
        Math.sin(phi) * Math.sin(theta) * radius
      );
      dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color={COLORS.highlight} transparent opacity={0.7} />
    </instancedMesh>
  );
};

/**
 * Energy beam connections between agents
 */
const AgentConnections: React.FC = () => {
  // Agent positions
  const positions: [number, number, number][] = [
    [-4, 1, -2],   // Contract Analyst
    [3, 0.5, -3],  // Vendor Intelligence
    [0, 2, -6],    // Legal Operations
    [-2, 3, -8],   // Compliance Guardian
  ];

  // Connection pairs
  const connections: [[number, number, number], [number, number, number]][] = [
    [positions[0], positions[1]],
    [positions[0], positions[2]],
    [positions[1], positions[2]],
    [positions[2], positions[3]],
    [positions[0], positions[3]],
  ];

  return (
    <group>
      {connections.map((conn, i) => (
        <ConnectionBeam
          key={i}
          start={conn[0]}
          end={conn[1]}
          color={COLORS.primary}
          width={0.015}
          pulseSpeed={2 + i * 0.5}
        />
      ))}
    </group>
  );
};

export default AIAgentEntities;
