"use client";

import { QuadraticBezierLine } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

const COLORS = {
  deep: '#291528',
  primary: '#9e829c',
  highlight: '#dab5d5',
  white: '#f0eff4',
  bloom: '#c388bb',
};

interface ShapeProps {
  color: string;
  active: boolean;
}

// ============================================
// CONTRACT ANALYST - Document Stack with Scanning Line
// Visual metaphor: Document processor / Scanner
// ============================================
export const ContractAnalystShape: React.FC<ShapeProps> = ({ color, active }) => {
  const groupRef = useRef<THREE.Group>(null);
  const scanLineRef = useRef<THREE.Mesh>(null);
  const documentsRef = useRef<THREE.Group>(null);

  // Document stack configuration
  const documents = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      y: i * 0.15 - 0.3,
      rotation: (i - 2) * 0.05,
      scale: 1 - i * 0.02,
    }));
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Rotate the entire stack gently
    if (groupRef.current) {
      groupRef.current.rotation.y += active ? 0.02 : 0.005;
    }

    // Animate scanning line
    if (scanLineRef.current) {
      // Scanning line moves up and down
      const scanY = Math.sin(t * (active ? 3 : 1.5)) * 0.4;
      scanLineRef.current.position.y = scanY;
      // Glow intensifies when active
      const material = scanLineRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = active ? 0.9 : 0.5;
    }

    // Separate documents when active
    if (documentsRef.current) {
      documentsRef.current.children.forEach((doc, i) => {
        const targetY = active
          ? documents[i].y + (i - 2) * 0.3 // Spread out
          : documents[i].y;
        doc.position.y = THREE.MathUtils.lerp(doc.position.y, targetY, 0.1);

        // Add slight wobble when active
        if (active) {
          doc.rotation.z = Math.sin(t * 2 + i) * 0.05;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Document stack */}
      <group ref={documentsRef}>
        {documents.map((doc, i) => (
          <mesh key={i} position={[0, doc.y, 0]} rotation={[0, doc.rotation, 0]}>
            <boxGeometry args={[1.2 * doc.scale, 0.05, 0.9 * doc.scale]} />
            <meshStandardMaterial
              color={i === 2 ? color : COLORS.white}
              emissive={i === 2 ? color : COLORS.primary}
              emissiveIntensity={active ? 0.5 : 0.2}
              roughness={0.3}
              metalness={0.1}
              transparent
              opacity={0.9 - i * 0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Scanning line */}
      <mesh ref={scanLineRef} position={[0, 0, 0.5]}>
        <planeGeometry args={[1.4, 0.02]} />
        <meshBasicMaterial
          color={COLORS.highlight}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Scanning line glow */}
      <mesh position={[0, 0, 0.5]}>
        <planeGeometry args={[1.4, 0.1]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.3 : 0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Text lines on documents (simulated) */}
      {[0.2, 0, -0.2].map((z, i) => (
        <mesh key={i} position={[-0.3, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 0.02]} />
          <meshBasicMaterial
            color={COLORS.deep}
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
};

// ============================================
// VENDOR INTELLIGENCE - Network Graph
// Visual metaphor: Relationship network with pulsing connections
// ============================================
export const VendorIntelligenceShape: React.FC<ShapeProps> = ({ color, active }) => {
  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<number>(0);

  // Network nodes configuration
  const nodes = useMemo(() => {
    const nodePositions: Array<{ pos: THREE.Vector3; size: number; orbit: number }> = [
      { pos: new THREE.Vector3(0, 0, 0), size: 0.3, orbit: 0 }, // Central node
    ];

    // Orbiting nodes
    const orbitCount = 8;
    for (let i = 0; i < orbitCount; i++) {
      const angle = (i / orbitCount) * Math.PI * 2;
      const radius = 1 + Math.random() * 0.3;
      const height = (Math.random() - 0.5) * 0.8;
      nodePositions.push({
        pos: new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ),
        size: 0.1 + Math.random() * 0.1,
        orbit: angle,
      });
    }

    return nodePositions;
  }, []);

  // Connection pairs
  const connections = useMemo(() => {
    const conns: Array<[number, number]> = [];
    // Connect all nodes to center
    for (let i = 1; i < nodes.length; i++) {
      conns.push([0, i]);
    }
    // Some cross-connections
    conns.push([1, 3], [2, 5], [4, 7], [6, 8]);
    return conns;
  }, [nodes]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Rotate entire network
    if (groupRef.current) {
      groupRef.current.rotation.y += active ? 0.015 : 0.005;
    }

    // Orbit animation for nodes
    if (nodesRef.current) {
      nodesRef.current.children.forEach((node, i) => {
        if (i === 0) return; // Skip central node

        const nodeData = nodes[i];
        const orbitSpeed = active ? 0.5 : 0.2;
        const angle = nodeData.orbit + t * orbitSpeed;
        const radius = 1 + (active ? Math.sin(t * 2 + i) * 0.2 : 0);

        node.position.x = Math.cos(angle) * radius;
        node.position.z = Math.sin(angle) * radius;
        node.position.y = nodeData.pos.y + Math.sin(t + i) * 0.1;

        // Pulse effect
        const scale = nodeData.size * (1 + Math.sin(t * 3 + i) * 0.1);
        node.scale.setScalar(active ? scale * 1.2 : scale);
      });
    }

    // Track pulse for connections
    pulseRef.current = (t * (active ? 2 : 1)) % 1;
  });

  return (
    <group ref={groupRef}>
      {/* Network nodes */}
      <group ref={nodesRef}>
        {nodes.map((node, i) => (
          <mesh key={i} position={node.pos.toArray()}>
            <icosahedronGeometry args={[node.size, 1]} />
            <meshStandardMaterial
              color={i === 0 ? color : COLORS.white}
              emissive={i === 0 ? color : COLORS.primary}
              emissiveIntensity={active ? 0.8 : 0.3}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
        ))}
      </group>

      {/* Connections - curved lines between nodes */}
      {connections.map(([from, to], i) => {
        const fromPos = nodes[from].pos;
        const toPos = nodes[to].pos;
        const midPoint = new THREE.Vector3()
          .addVectors(fromPos, toPos)
          .multiplyScalar(0.5)
          .add(new THREE.Vector3(0, 0.3, 0));

        return (
          <QuadraticBezierLine
            key={i}
            start={fromPos}
            end={toPos}
            mid={midPoint}
            color={active ? color : COLORS.primary}
            lineWidth={active ? 2 : 1}
            transparent
            opacity={active ? 0.8 : 0.4}
          />
        );
      })}

      {/* Central glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.2 : 0.05}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// ============================================
// LEGAL OPERATIONS - Interlocking Torus Rings
// Visual metaphor: Workflow mechanism with alignment bursts
// ============================================
export const LegalOperationsShape: React.FC<ShapeProps> = ({ color, active }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const burstRef = useRef<THREE.Mesh>(null);
  const alignmentRef = useRef<number>(0);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const speed = active ? 1.5 : 0.5;

    // Rotate rings on different axes
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * speed;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = t * speed * 0.7;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z = t * speed * 0.5;
      ring3Ref.current.rotation.x = Math.PI / 4;
    }

    // Calculate alignment (how synchronized the rings are)
    const alignment = Math.abs(
      Math.sin(t * speed) * Math.sin(t * speed * 0.7) * Math.sin(t * speed * 0.5)
    );
    alignmentRef.current = alignment;

    // Burst effect on high alignment
    if (burstRef.current) {
      const burstScale = alignment > 0.9 ? 3 : 0;
      burstRef.current.scale.lerp(
        new THREE.Vector3(burstScale, burstScale, burstScale),
        0.1
      );
      const material = burstRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = alignment > 0.9 ? 0.5 : 0;
    }

    // Gentle group rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Ring 1 - Outer, rotates on X */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1, 0.05, 8, 32]} />
        <meshStandardMaterial
          color={COLORS.white}
          emissive={COLORS.primary}
          emissiveIntensity={active ? 0.5 : 0.2}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Ring 2 - Middle, rotates on Y */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[0.8, 0.05, 8, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.6 : 0.3}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Ring 3 - Inner, rotates on Z (tilted) */}
      <mesh ref={ring3Ref}>
        <torusGeometry args={[0.6, 0.05, 8, 32]} />
        <meshStandardMaterial
          color={COLORS.highlight}
          emissive={COLORS.highlight}
          emissiveIntensity={active ? 0.7 : 0.3}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Core sphere */}
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 1 : 0.5}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Alignment burst effect */}
      <mesh ref={burstRef} scale={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color={COLORS.white}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// ============================================
// COMPLIANCE GUARDIAN - Hexagonal Shield
// Visual metaphor: Protective barrier with orbiting panels
// ============================================
export const ComplianceGuardianShape: React.FC<ShapeProps> = ({ color, active }) => {
  const groupRef = useRef<THREE.Group>(null);
  const panelsRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  // Shield panel configuration
  const panels = useMemo(() => {
    const panelData: Array<{
      angle: number;
      height: number;
      distance: number;
    }> = [];

    const panelCount = 12;
    for (let i = 0; i < panelCount; i++) {
      const angle = (i / panelCount) * Math.PI * 2;
      panelData.push({
        angle,
        height: (Math.random() - 0.5) * 0.4,
        distance: 0.9 + Math.random() * 0.2,
      });
    }

    return panelData;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Gentle rotation of the whole shield
    if (groupRef.current) {
      groupRef.current.rotation.y += active ? 0.01 : 0.003;
    }

    // Core pulsing
    if (coreRef.current) {
      const pulse = 1 + Math.sin(t * 2) * 0.1;
      coreRef.current.scale.setScalar(active ? pulse * 1.2 : pulse);
    }

    // Animate shield panels
    if (panelsRef.current) {
      panelsRef.current.children.forEach((panel, i) => {
        const panelData = panels[i];
        const orbitSpeed = active ? 0.3 : 0.1;

        // Orbit around core
        const angle = panelData.angle + t * orbitSpeed;
        const distance = panelData.distance + (active ? 0.3 : 0);

        panel.position.x = Math.cos(angle) * distance;
        panel.position.z = Math.sin(angle) * distance;
        panel.position.y = panelData.height + Math.sin(t + i) * 0.05;

        // Face outward
        panel.rotation.y = -angle + Math.PI / 2;

        // Expand panels when active
        const targetScale = active ? 1.3 : 1;
        panel.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.1
        );
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central hexagonal prism core */}
      <mesh ref={coreRef}>
        <cylinderGeometry args={[0.4, 0.4, 0.6, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 0.8 : 0.4}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Orbiting shield panels */}
      <group ref={panelsRef}>
        {panels.map((panel, i) => (
          <mesh
            key={i}
            position={[
              Math.cos(panel.angle) * panel.distance,
              panel.height,
              Math.sin(panel.angle) * panel.distance,
            ]}
          >
            <boxGeometry args={[0.3, 0.4, 0.05]} />
            <meshStandardMaterial
              color={COLORS.white}
              emissive={COLORS.primary}
              emissiveIntensity={active ? 0.5 : 0.2}
              roughness={0.2}
              metalness={0.8}
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}
      </group>

      {/* Outer wireframe sphere (force field) */}
      <mesh>
        <sphereGeometry args={[1.4, 16, 16]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={active ? 0.3 : 0.1}
        />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.2 : 0.05}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

export {
  ContractAnalystShape as NewAnalystShape,
  VendorIntelligenceShape as NewIntelShape,
  LegalOperationsShape as NewLegalShape,
  ComplianceGuardianShape as NewGuardianShape,
};
