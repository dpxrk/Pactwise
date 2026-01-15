"use client";

import { Box, Octahedron, Icosahedron } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import * as THREE from 'three';

interface ShapeProps {
  color: string;
  active: boolean;
}

// Analyst Agent - Nested wireframe/solid boxes
export const AnalystShape: React.FC<ShapeProps> = ({ color, active }) => {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += active ? 0.05 : 0.01;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={ref}>
      {/* White wireframe outer box */}
      <Box args={[1.2, 1.2, 1.2]}>
        <meshStandardMaterial
          color="#f0eff4"
          wireframe
          transparent
          opacity={active ? 0.9 : 0.5}
        />
      </Box>
      {/* Colored solid inner box */}
      <Box args={[0.8, 0.8, 0.8]}>
        <meshStandardMaterial
          color={color}
          roughness={0.1}
          metalness={0.9}
          emissive={color}
          emissiveIntensity={active ? 0.5 : 0.2}
        />
      </Box>
    </group>
  );
};

// Intel Agent - Icosahedron with particle points
export const IntelShape: React.FC<ShapeProps> = ({ color, active }) => {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y -= active ? 0.05 : 0.02;
    }
  });

  return (
    <group ref={ref}>
      {/* White wireframe icosahedron */}
      <Icosahedron args={[0.8, 1]}>
        <meshBasicMaterial
          color="#f0eff4"
          wireframe
          transparent
          opacity={active ? 0.9 : 0.5}
        />
      </Icosahedron>
      {/* Colored particle points */}
      <points>
        <sphereGeometry args={[1.2, 16, 16]} />
        <pointsMaterial
          color={color}
          size={0.05}
          transparent
          opacity={active ? 1 : 0.8}
        />
      </points>
    </group>
  );
};

// Legal Agent - Dodecahedron with emissive wireframe
export const LegalShape: React.FC<ShapeProps> = ({ color, active }) => {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.x += active ? 0.04 : 0.01;
      ref.current.rotation.z += active ? 0.05 : 0.02;
    }
  });

  return (
    <group ref={ref}>
      {/* White wireframe dodecahedron */}
      <mesh>
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial
          color="#f0eff4"
          roughness={0.4}
          metalness={0.6}
          wireframe
          emissive="#f0eff4"
          emissiveIntensity={active ? 0.5 : 0.2}
        />
      </mesh>
      {/* Inner colored glow sphere */}
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.6 : 0.3}
        />
      </mesh>
    </group>
  );
};

// Compliance Guardian - Glass octahedron with cage
export const GuardianShape: React.FC<ShapeProps> = ({ color, active }) => {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * (active ? 2 : 0.5)) * 0.5;
    }
  });

  return (
    <group ref={ref}>
      {/* Inner colored glass octahedron */}
      <Octahedron args={[0.9, 0]}>
        <meshPhysicalMaterial
          color={color}
          transmission={0.6}
          thickness={1}
          roughness={0}
          ior={1.5}
          opacity={0.5}
          transparent
        />
      </Octahedron>
      {/* Outer white wireframe cage */}
      <Octahedron args={[1.1, 0]}>
        <meshBasicMaterial
          color="#f0eff4"
          wireframe
          transparent
          opacity={active ? 0.9 : 0.5}
        />
      </Octahedron>
    </group>
  );
};
