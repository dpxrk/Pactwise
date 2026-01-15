"use client";

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

import { AbstractAgentCore } from '@/lib/shaders/materials/AbstractAgentMaterial';
import { ConnectionBeam, EnergyFlowStream } from '@/lib/shaders/materials/EnergyFlowMaterial';

// Pactwise color palette
const COLORS = {
  deepPurple: '#291528',
  warmPurple: '#4a2545',
  primary: '#9e829c',
  highlight: '#dab5d5',
  accent: '#c388bb',
  white: '#f0eff4',
  contract: '#c388bb',
  vendor: '#9e829c',
  insight: '#fbbf24',
};

interface EcosystemNetworkProps {
  visible?: boolean;
  animateIn?: boolean;
  scrollProgress?: number;
}

type NodeType = 'contract' | 'vendor' | 'insight' | 'central';

interface NetworkNode {
  id: string;
  type: NodeType;
  position: [number, number, number];
  label: string;
  connections: string[];
}

/**
 * Ecosystem Network - Shows how contracts, vendors, and insights are interconnected
 * Using custom shaders for organic nodes and energy beam connections
 */
export const EcosystemNetwork: React.FC<EcosystemNetworkProps> = ({
  visible = true,
  animateIn = true,
  scrollProgress = 0.7,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Calculate visibility based on scroll
  const networkVisibility = useMemo(() => {
    if (scrollProgress < 0.55) return 0;
    if (scrollProgress < 0.65) return (scrollProgress - 0.55) / 0.1;
    return 1;
  }, [scrollProgress]);

  // Network nodes - represents the Pactwise ecosystem
  const nodes: NetworkNode[] = useMemo(() => [
    // Central hub
    { id: 'hub', type: 'central', position: [0, 0, 0], label: 'Pactwise', connections: [] },

    // Contract nodes (pink) - left side cluster
    { id: 'c1', type: 'contract', position: [-6, 2, -2], label: 'Software License', connections: ['hub', 'v1', 'i1'] },
    { id: 'c2', type: 'contract', position: [-5, -1, -3], label: 'Service Agreement', connections: ['hub', 'v2'] },
    { id: 'c3', type: 'contract', position: [-7, 0.5, 0], label: 'NDA', connections: ['hub', 'v1', 'v3'] },
    { id: 'c4', type: 'contract', position: [-4, 3, 1], label: 'Master Agreement', connections: ['hub', 'c1', 'c2'] },

    // Vendor nodes (purple) - right side cluster
    { id: 'v1', type: 'vendor', position: [5, 1.5, -1], label: 'Acme Corp', connections: ['hub'] },
    { id: 'v2', type: 'vendor', position: [6, -0.5, -2], label: 'TechVendor', connections: ['hub'] },
    { id: 'v3', type: 'vendor', position: [4, 2.5, 1], label: 'CloudServ', connections: ['hub'] },
    { id: 'v4', type: 'vendor', position: [5.5, -2, 0], label: 'DataPro', connections: ['hub', 'v2'] },

    // Insight nodes (gold) - top cluster
    { id: 'i1', type: 'insight', position: [0, 4, -2], label: 'Risk: Low', connections: ['hub'] },
    { id: 'i2', type: 'insight', position: [-2, 3.5, 0], label: '$2.4M Value', connections: ['hub', 'c1'] },
    { id: 'i3', type: 'insight', position: [2, 3, -1], label: '92% Compliant', connections: ['hub', 'v1'] },
    { id: 'i4', type: 'insight', position: [0, 5, 1], label: 'Renewal: 45d', connections: ['hub', 'c4'] },
  ], []);

  // Create node lookup for connections
  const nodeMap = useMemo(() => {
    const map = new Map<string, NetworkNode>();
    nodes.forEach(node => map.set(node.id, node));
    return map;
  }, [nodes]);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      // Gentle overall rotation
      groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.08;
    }
  });

  if (!visible || networkVisibility <= 0) return null;

  return (
    <group
      ref={groupRef}
      position={[0, 0, -3]}
      scale={[networkVisibility, networkVisibility, networkVisibility]}
    >
      {/* Energy beam connections (behind nodes) */}
      {nodes.map(node =>
        node.connections.map(targetId => {
          const target = nodeMap.get(targetId);
          if (!target) return null;
          return (
            <ConnectionBeam
              key={`${node.id}-${targetId}`}
              start={node.position}
              end={target.position}
              color={getNodeColor(node.type)}
              width={0.02}
              pulseSpeed={2 + Math.random() * 2}
            />
          );
        })
      )}

      {/* Network nodes with custom shaders */}
      {nodes.map(node => (
        <NetworkNodeComponent
          key={node.id}
          node={node}
          animateIn={animateIn}
        />
      ))}

      {/* Data flow particles along connections */}
      <DataFlowParticles nodes={nodes} nodeMap={nodeMap} />
    </group>
  );
};

// Helper to get color for node type
function getNodeColor(type: NodeType): string {
  switch (type) {
    case 'contract': return COLORS.contract;
    case 'vendor': return COLORS.vendor;
    case 'insight': return COLORS.insight;
    case 'central': return COLORS.white;
    default: return COLORS.primary;
  }
}

/**
 * Individual network node component using custom shaders
 */
interface NetworkNodeComponentProps {
  node: NetworkNode;
  animateIn: boolean;
}

const NetworkNodeComponent: React.FC<NetworkNodeComponentProps> = ({
  node,
  animateIn: _animateIn,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Node colors based on type
  const nodeColors = useMemo(() => {
    switch (node.type) {
      case 'contract':
        return { color1: '#4a2545', color2: '#c388bb' };
      case 'vendor':
        return { color1: '#291528', color2: '#9e829c' };
      case 'insight':
        return { color1: '#92400e', color2: '#fbbf24' };
      case 'central':
        return { color1: '#291528', color2: '#dab5d5' };
      default:
        return { color1: '#291528', color2: '#9e829c' };
    }
  }, [node.type]);

  // Node size based on type
  const nodeSize = node.type === 'central' ? 0.5 : 0.25;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      // Floating animation
      const floatOffset = node.id.charCodeAt(0) * 0.1;
      groupRef.current.position.y = node.position[1] + Math.sin(t * 0.5 + floatOffset) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={node.position}>
      {/* Organic shader core */}
      <AbstractAgentCore
        scale={nodeSize}
        color1={nodeColors.color1}
        color2={nodeColors.color2}
        noiseScale={node.type === 'central' ? 1.5 : 2.5}
        noiseStrength={node.type === 'central' ? 0.12 : 0.15}
        pulseSpeed={node.type === 'central' ? 1.0 : 1.5 + Math.random() * 0.5}
        glowIntensity={node.type === 'central' ? 0.7 : 0.5}
        segments={node.type === 'central' ? 48 : 32}
      />

      {/* Type-specific decorations */}
      {node.type === 'contract' && (
        <mesh rotation={[0, 0, Math.PI / 4]} scale={[1.5, 1.5, 1]}>
          <ringGeometry args={[nodeSize * 1.4, nodeSize * 1.5, 4]} />
          <meshBasicMaterial
            color={COLORS.contract}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {node.type === 'vendor' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[nodeSize * 1.4, nodeSize * 1.5, 32]} />
          <meshBasicMaterial
            color={COLORS.vendor}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {node.type === 'insight' && (
        <points>
          <sphereGeometry args={[nodeSize * 2.5, 8, 8]} />
          <pointsMaterial
            color={COLORS.insight}
            size={0.03}
            transparent
            opacity={0.5}
          />
        </points>
      )}

      {node.type === 'central' && (
        <>
          <mesh rotation={[0, 0, 0]}>
            <ringGeometry args={[nodeSize * 2, nodeSize * 2.1, 32]} />
            <meshBasicMaterial
              color={COLORS.accent}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[nodeSize * 2, nodeSize * 2.1, 32]} />
            <meshBasicMaterial
              color={COLORS.accent}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}

      {/* Label */}
      <Text
        position={[0, nodeSize + 0.35, 0]}
        fontSize={0.12}
        color={COLORS.white}
        anchorX="center"
        anchorY="bottom"
      >
        {node.label}
      </Text>
    </group>
  );
};

/**
 * Data flow particles moving along connections
 */
interface DataFlowParticlesProps {
  nodes: NetworkNode[];
  nodeMap: Map<string, NetworkNode>;
}

const DataFlowParticles: React.FC<DataFlowParticlesProps> = ({ nodes, nodeMap }) => {
  // Generate energy flow streams for major connections
  const streams = useMemo(() => {
    const result: Array<{
      start: [number, number, number];
      end: [number, number, number];
      color1: string;
      color2: string;
    }> = [];

    // Only create streams for hub connections to reduce visual noise
    nodes.forEach(node => {
      if (node.id === 'hub') return;
      const hub = nodeMap.get('hub');
      if (hub && node.connections.includes('hub')) {
        result.push({
          start: node.position,
          end: hub.position,
          color1: getNodeColor(node.type),
          color2: COLORS.highlight,
        });
      }
    });

    return result;
  }, [nodes, nodeMap]);

  return (
    <group>
      {streams.map((stream, i) => (
        <EnergyFlowStream
          key={i}
          startPos={stream.start}
          endPos={stream.end}
          particleCount={30}
          flowSpeed={0.1}
          color1={stream.color1}
          color2={stream.color2}
          pointSize={2}
        />
      ))}
    </group>
  );
};

export default EcosystemNetwork;
