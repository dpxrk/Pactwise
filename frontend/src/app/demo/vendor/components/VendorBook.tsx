'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
// Removed Text import to avoid CSP worker issues
import * as THREE from 'three';
import type { Book3DProps } from '../types';

export default function VendorBook({
  vendor,
  position,
  onClick,
  isHighlighted = false,
  isSelected = false
}: Book3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Book dimensions based on contract count
  const baseThickness = 0.15;
  const thickness = baseThickness + (vendor.contractCount * 0.02);
  const height = 1.5;
  const width = 1.0;

  // Color based on status
  const getBookColor = () => {
    if (isSelected) return '#9e829c'; // Mountbatten pink when selected
    if (isHighlighted) return '#c388bb'; // Light purple when highlighted

    switch (vendor.status) {
      case 'active':
        return '#291528'; // Dark purple
      case 'pending':
        return '#d97706'; // Amber
      case 'inactive':
        return '#80808c'; // Ghost gray
      default:
        return '#291528';
    }
  };

  const bookColor = getBookColor();
  const spineColor = new THREE.Color(bookColor).multiplyScalar(0.8); // Slightly darker spine
  const edgeColor = new THREE.Color(bookColor).multiplyScalar(1.2); // Slightly lighter edges

  // Animation for hover state
  useFrame(() => {
    if (meshRef.current) {
      const targetZ = hovered ? 0.3 : 0;
      const targetScale = isSelected ? 1.1 : 1.0;

      // Smooth slide out on hover
      meshRef.current.position.z = THREE.MathUtils.lerp(
        meshRef.current.position.z,
        targetZ,
        0.1
      );

      // Smooth scale on selection
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      );
    }
  });

  // Glow effect for highlighted/selected books
  useFrame((state) => {
    if ((isHighlighted || isSelected) && meshRef.current) {
      const pulseIntensity = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.9;
      meshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshStandardMaterial;
          material.emissiveIntensity = isSelected ? 0.3 * pulseIntensity : 0.2 * pulseIntensity;
        }
      });
    }
  });

  return (
    <group
      ref={meshRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(vendor);
      }}
    >
      {/* Book Cover (front) */}
      <mesh position={[0, 0, thickness / 2]}>
        <boxGeometry args={[width, height, 0.02]} />
        <meshStandardMaterial
          color={bookColor}
          metalness={0.2}
          roughness={0.8}
          emissive={bookColor}
          emissiveIntensity={isHighlighted || isSelected ? 0.2 : 0}
        />
      </mesh>

      {/* Book Back */}
      <mesh position={[0, 0, -thickness / 2]}>
        <boxGeometry args={[width, height, 0.02]} />
        <meshStandardMaterial
          color={bookColor}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>

      {/* Book Spine (left side - visible from front) */}
      <mesh position={[-width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[thickness, height, 0.02]} />
        <meshStandardMaterial
          color={spineColor}
          metalness={0.3}
          roughness={0.7}
          emissive={spineColor}
          emissiveIntensity={isHighlighted || isSelected ? 0.2 : 0}
        />
      </mesh>

      {/* Vendor name removed - will use HTML overlay instead */}

      {/* Book Pages (top, bottom, right edges) */}
      {/* Top edge */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, 0.02, thickness]} />
        <meshStandardMaterial
          color={edgeColor}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      {/* Bottom edge */}
      <mesh position={[0, -height / 2, 0]}>
        <boxGeometry args={[width, 0.02, thickness]} />
        <meshStandardMaterial
          color={edgeColor}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      {/* Right edge (pages) */}
      <mesh position={[width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[thickness, height, 0.02]} />
        <meshStandardMaterial
          color="#f0eff4"
          metalness={0.05}
          roughness={0.95}
        />
      </mesh>

      {/* Contract count indicator (small badge on spine) */}
      {vendor.contractCount > 0 && (
        <mesh position={[-width / 2 + 0.04, height / 2 - 0.2, 0]}>
          <circleGeometry args={[0.08, 16]} />
          <meshStandardMaterial
            color={vendor.contractCount >= 5 ? '#059669' : '#9e829c'}
            metalness={0.6}
            roughness={0.4}
            emissive={vendor.contractCount >= 5 ? '#059669' : '#9e829c'}
            emissiveIntensity={0.3}
          />
        </mesh>
      )}

      {/* Performance score indicator (subtle line on spine) */}
      <mesh position={[-width / 2 + 0.025, -height / 2 + 0.1 + (vendor.performanceScore / 100) * (height - 0.2), 0]}>
        <boxGeometry args={[0.01, 0.05, 0.01]} />
        <meshStandardMaterial
          color={
            vendor.performanceScore >= 90 ? '#059669' :
            vendor.performanceScore >= 75 ? '#9e829c' :
            '#d97706'
          }
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Hover effect - glow only, tooltip will be HTML overlay */}
    </group>
  );
}
