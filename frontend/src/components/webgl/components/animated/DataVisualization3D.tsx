"use client";

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import {
  HolographicGauge,
  HolographicRings,
  HolographicBars,
  FloatingHologramFrame,
} from '@/lib/shaders/materials/HolographicMaterial';

// Pactwise color palette
const COLORS = {
  deepPurple: '#291528',
  warmPurple: '#4a2545',
  primary: '#9e829c',
  highlight: '#dab5d5',
  accent: '#c388bb',
  white: '#f0eff4',
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#f87171',
};

interface DataVisualization3DProps {
  scrollProgress: number;
  showRiskGauge?: boolean;
  showCompliance?: boolean;
  showKeyTerms?: boolean;
}

/**
 * 3D Data Visualizations - The Intelligence Core
 * Using custom holographic shaders for sci-fi aesthetic
 */
export const DataVisualization3D: React.FC<DataVisualization3DProps> = ({
  scrollProgress,
  showRiskGauge = true,
  showCompliance = true,
  showKeyTerms = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Calculate visibility based on scroll (appears during 35-85% scroll)
  const visibility = useMemo(() => {
    if (scrollProgress < 0.35) return 0;
    if (scrollProgress < 0.45) return (scrollProgress - 0.35) / 0.1;
    if (scrollProgress < 0.75) return 1;
    if (scrollProgress < 0.85) return 1 - (scrollProgress - 0.75) / 0.1;
    return 0;
  }, [scrollProgress]);

  useFrame((state) => {
    if (groupRef.current) {
      // Subtle rotation to show depth
      groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.08;
    }
  });

  if (visibility <= 0) return null;

  return (
    <group
      ref={groupRef}
      position={[0, 2, -5]}
      scale={[visibility, visibility, visibility]}
    >
      {/* Risk Score Display - positioned left */}
      {showRiskGauge && <RiskScoreDisplay position={[-4.5, 0, 0]} />}

      {/* Compliance Status Display - positioned center */}
      {showCompliance && <ComplianceStatusDisplay position={[0, 0.5, -2]} />}

      {/* Key Terms Display - positioned right */}
      {showKeyTerms && <KeyTermsDisplay position={[4.5, 0, 0]} />}

      {/* Metrics Bar Display - below center */}
      <MetricsBarDisplay position={[0, -2.5, 0]} />

      {/* Central connection node */}
      <CentralNode />
    </group>
  );
};

/**
 * Risk Score Display
 * Holographic circular gauge
 */
interface DisplayProps {
  position: [number, number, number];
}

const RiskScoreDisplay: React.FC<DisplayProps> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.8) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Holographic frame */}
      <FloatingHologramFrame size={[2.8, 2.8]} color={COLORS.accent} />

      {/* Main gauge */}
      <HolographicGauge
        position={[0, 0, 0.01]}
        value={0.35}
        size={2.2}
        color={COLORS.success}
      />

      {/* Title */}
      <Text
        position={[0, 1.6, 0]}
        fontSize={0.14}
        color={COLORS.primary}
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-medium.woff"
      >
        CONTRACT RISK
      </Text>

      {/* Value label */}
      <Text
        position={[0, -0.1, 0.1]}
        fontSize={0.25}
        color={COLORS.white}
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-bold.woff"
      >
        35%
      </Text>

      {/* Status text */}
      <Text
        position={[0, -0.5, 0.1]}
        fontSize={0.1}
        color={COLORS.success}
        anchorX="center"
        anchorY="middle"
      >
        LOW RISK
      </Text>

      {/* Decorative particles */}
      <GaugeParticles color={COLORS.success} />
    </group>
  );
};

/**
 * Compliance Status Display
 * Concentric holographic rings
 */
const ComplianceStatusDisplay: React.FC<DisplayProps> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.7 + 1) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[Math.PI / 6, 0, 0]}>
      {/* Holographic frame (rotated back to face camera) */}
      <group rotation={[-Math.PI / 6, 0, 0]}>
        <FloatingHologramFrame
          position={[0, 0, -0.1]}
          size={[3.2, 3.2]}
          color={COLORS.primary}
        />
      </group>

      {/* Main rings */}
      <HolographicRings
        position={[0, 0, 0]}
        value={0.87}
        size={2.8}
        color={COLORS.accent}
      />

      {/* Title (rotated to face camera) */}
      <group rotation={[-Math.PI / 6, 0, 0]}>
        <Text
          position={[0, 1.8, 0]}
          fontSize={0.14}
          color={COLORS.primary}
          anchorX="center"
          anchorY="middle"
        >
          COMPLIANCE STATUS
        </Text>

        {/* Value */}
        <Text
          position={[0, 0, 0.5]}
          fontSize={0.28}
          color={COLORS.white}
          anchorX="center"
          anchorY="middle"
        >
          87%
        </Text>

        <Text
          position={[0, -0.4, 0.5]}
          fontSize={0.1}
          color={COLORS.highlight}
          anchorX="center"
          anchorY="middle"
        >
          OVERALL COMPLIANT
        </Text>
      </group>

      {/* Category labels */}
      <ComplianceLabels />
    </group>
  );
};

/**
 * Compliance category labels orbiting the rings
 */
const ComplianceLabels: React.FC = () => {
  const categories = [
    { name: 'GDPR', value: '92%', angle: 0 },
    { name: 'SOC2', value: '85%', angle: Math.PI / 2 },
    { name: 'HIPAA', value: '78%', angle: Math.PI },
    { name: 'ISO', value: '95%', angle: Math.PI * 1.5 },
  ];

  return (
    <group rotation={[-Math.PI / 6, 0, 0]}>
      {categories.map((cat, i) => {
        const radius = 1.8;
        const x = Math.cos(cat.angle) * radius;
        const y = Math.sin(cat.angle) * radius * 0.5;
        return (
          <group key={i} position={[x, y, 0.3]}>
            <Text
              fontSize={0.08}
              color={COLORS.highlight}
              anchorX="center"
              anchorY="middle"
            >
              {cat.name}
            </Text>
            <Text
              position={[0, -0.12, 0]}
              fontSize={0.1}
              color={COLORS.white}
              anchorX="center"
              anchorY="middle"
            >
              {cat.value}
            </Text>
          </group>
        );
      })}
    </group>
  );
};

/**
 * Key Terms Display
 * Floating holographic term cloud
 */
const KeyTermsDisplay: React.FC<DisplayProps> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);

  const terms = useMemo(() => [
    { text: 'Indemnification', size: 0.14, pos: [0, 0.6, 0] as [number, number, number], color: COLORS.highlight },
    { text: 'Liability Cap', size: 0.11, pos: [-0.7, 0.1, 0.2] as [number, number, number], color: COLORS.white },
    { text: 'Term: 24mo', size: 0.12, pos: [0.6, -0.2, 0.15] as [number, number, number], color: COLORS.accent },
    { text: 'Auto-Renewal', size: 0.1, pos: [-0.4, -0.5, 0.1] as [number, number, number], color: COLORS.white },
    { text: 'NDA Required', size: 0.09, pos: [0.3, 0.9, -0.1] as [number, number, number], color: COLORS.highlight },
    { text: 'Payment Net-30', size: 0.1, pos: [0.8, 0.4, 0] as [number, number, number], color: COLORS.white },
    { text: 'IP Rights', size: 0.11, pos: [-0.2, 0.3, 0.3] as [number, number, number], color: COLORS.accent },
  ], []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.6 + 2) * 0.1;
      // Animate individual terms
      groupRef.current.children.forEach((child, i) => {
        if (child.type === 'Group') {
          child.position.y += Math.sin(t * 0.5 + i * 0.5) * 0.0008;
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Holographic frame */}
      <FloatingHologramFrame size={[2.6, 2.6]} color={COLORS.primary} />

      {/* Title */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.14}
        color={COLORS.primary}
        anchorX="center"
        anchorY="middle"
      >
        KEY TERMS EXTRACTED
      </Text>

      {/* Floating terms */}
      {terms.map((term, i) => (
        <group key={i} position={term.pos}>
          <Text
            fontSize={term.size}
            color={term.color}
            anchorX="center"
            anchorY="middle"
          >
            {term.text}
          </Text>
        </group>
      ))}

      {/* Central node */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={COLORS.accent} transparent opacity={0.8} />
      </mesh>

      {/* Connection lines */}
      <TermConnections terms={terms} />
    </group>
  );
};

/**
 * Connection lines from center to terms
 */
interface TermConnectionsProps {
  terms: Array<{ pos: [number, number, number] }>;
}

const TermConnections: React.FC<TermConnectionsProps> = ({ terms }) => {
  const linesRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (linesRef.current) {
      linesRef.current.children.forEach((line, i) => {
        const mesh = line as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.15 + Math.sin(t * 2 + i) * 0.1;
      });
    }
  });

  return (
    <group ref={linesRef}>
      {terms.map((term, i) => {
        const start = new THREE.Vector3(0, 0, 0);
        const end = new THREE.Vector3(...term.pos);
        const length = start.distanceTo(end);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const direction = end.clone().sub(start).normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction
        );

        return (
          <mesh key={i} position={mid.toArray()} quaternion={quaternion}>
            <cylinderGeometry args={[0.003, 0.003, length, 4]} />
            <meshBasicMaterial
              color={COLORS.primary}
              transparent
              opacity={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Metrics Bar Display
 * Holographic bar chart
 */
const MetricsBarDisplay: React.FC<DisplayProps> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.5 + 3) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Holographic bar visualization */}
      <HolographicBars
        position={[0, 0.5, 0]}
        value={0.9}
        width={5}
        height={1.2}
        color={COLORS.accent}
      />

      {/* Metric labels */}
      <MetricLabels />

      {/* Frame */}
      <FloatingHologramFrame
        position={[0, 0.5, -0.05]}
        size={[5.4, 1.6]}
        color={COLORS.primary}
      />
    </group>
  );
};

/**
 * Metric labels for bar chart
 */
const MetricLabels: React.FC = () => {
  const metrics = [
    { label: 'Contracts', value: '2.5M+' },
    { label: 'Time Saved', value: '87%' },
    { label: 'Accuracy', value: '99.7%' },
    { label: 'Savings', value: '$18M' },
  ];

  return (
    <group position={[0, 1.3, 0]}>
      {metrics.map((metric, i) => {
        const xPos = (i - 1.5) * 1.25;
        return (
          <group key={i} position={[xPos, 0, 0.1]}>
            <Text
              position={[0, 0, 0]}
              fontSize={0.14}
              color={COLORS.white}
              anchorX="center"
              anchorY="middle"
            >
              {metric.value}
            </Text>
            <Text
              position={[0, -0.2, 0]}
              fontSize={0.08}
              color={COLORS.primary}
              anchorX="center"
              anchorY="middle"
            >
              {metric.label}
            </Text>
          </group>
        );
      })}
    </group>
  );
};

/**
 * Central connection node
 */
const CentralNode: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.5;
      meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
      const scale = 1 + Math.sin(t * 2) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <octahedronGeometry args={[0.15, 0]} />
      <meshBasicMaterial
        color={COLORS.accent}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
};

/**
 * Decorative particles around gauge
 */
interface GaugeParticlesProps {
  color: string;
}

const GaugeParticles: React.FC<GaugeParticlesProps> = ({ color }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array(20).fill(0).map(() => ({
      angle: Math.random() * Math.PI * 2,
      radius: 1.0 + Math.random() * 0.3,
      speed: 0.2 + Math.random() * 0.3,
      size: 0.015 + Math.random() * 0.015,
      offset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();

    particles.forEach((p, i) => {
      const angle = p.angle + t * p.speed;
      const radius = p.radius + Math.sin(t * 2 + p.offset) * 0.1;

      dummy.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.3,
        Math.sin(t + p.offset) * 0.1
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
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </instancedMesh>
  );
};

export default DataVisualization3D;
