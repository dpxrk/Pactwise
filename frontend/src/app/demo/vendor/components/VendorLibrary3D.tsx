'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

import VendorBookShelf from './VendorBookShelf';
import type { VendorData } from '../types';

interface VendorLibrary3DProps {
  vendors: VendorData[];
  onVendorClick: (vendor: VendorData) => void;
  selectedVendor?: VendorData | null;
}

function LibraryScene({ vendors, onVendorClick, selectedVendor }: VendorLibrary3DProps) {
  // Group vendors by category
  const vendorsByCategory = useMemo(() => {
    const grouped: Record<string, VendorData[]> = {
      technology: [],
      services: [],
      consulting: [],
      manufacturing: []
    };

    vendors.forEach((vendor) => {
      if (grouped[vendor.category]) {
        grouped[vendor.category].push(vendor);
      }
    });

    console.log('Vendors by category:', grouped);
    return grouped;
  }, [vendors]);

  // Define shelf positions (stacked vertically)
  const shelfPositions: Record<string, [number, number, number]> = {
    technology: [0, 2.5, 0],
    services: [0, 0, 0],
    consulting: [0, -2.5, 0],
    manufacturing: [0, -5, 0]
  };

  return (
    <>
      {/* Test cube to verify rendering */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>

      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />

      {/* Key light (from top-right) */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Fill light (from left) */}
      <directionalLight
        position={[-5, 5, 3]}
        intensity={0.3}
      />

      {/* Rim light (from behind) */}
      <directionalLight
        position={[0, 3, -10]}
        intensity={0.2}
        color="#9e829c"
      />

      {/* Spotlights for each shelf */}
      {Object.entries(shelfPositions).map(([category, position]) => (
        <spotLight
          key={`spotlight-${category}`}
          position={[position[0], position[1] + 3, position[2] + 5]}
          angle={0.5}
          penumbra={0.5}
          intensity={0.5}
          castShadow
          target-position={position}
        />
      ))}

      {/* Render shelves with vendors */}
      {Object.entries(vendorsByCategory).map(([category, categoryVendors]) => {
        const position = shelfPositions[category];
        if (!position) return null;

        return (
          <VendorBookShelf
            key={category}
            vendors={categoryVendors}
            category={category}
            position={position}
            onVendorClick={onVendorClick}
            selectedVendor={selectedVendor}
          />
        );
      })}

      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -7, 0]}
        receiveShadow
      >
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color="#f0eff4"
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      {/* Subtle grid pattern on floor */}
      <gridHelper
        args={[50, 50, '#d2d1de', '#e1e0e9']}
        position={[0, -6.99, 0]}
      />

      {/* Back wall */}
      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#f0eff4"
          metalness={0.05}
          roughness={0.95}
        />
      </mesh>

      {/* Additional ambient lights for better reflections */}
      <hemisphereLight
        intensity={0.5}
        color="#f0eff4"
        groundColor="#291528"
      />

      {/* Fog for depth */}
      <fog attach="fog" args={['#f0eff4', 10, 30]} />
    </>
  );
}

export default function VendorLibrary3D({
  vendors,
  onVendorClick,
  selectedVendor
}: VendorLibrary3DProps) {
  console.log('VendorLibrary3D rendering with vendors:', vendors.length);

  return (
    <div className="w-full h-[600px] bg-white border border-ghost-300 rounded-lg overflow-hidden relative">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
      >
        {/* Camera setup */}
        <PerspectiveCamera
          makeDefault
          position={[0, 0, 12]}
          fov={50}
        />

        {/* Orbit controls for interaction */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={8}
          maxDistance={20}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
          target={[0, 0, 0]}
          dampingFactor={0.05}
          enableDamping
        />

        <Suspense fallback={null}>
          <LibraryScene
            vendors={vendors}
            onVendorClick={onVendorClick}
            selectedVendor={selectedVendor}
          />
        </Suspense>
      </Canvas>

      {/* On-canvas instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-ghost-300 pointer-events-none z-10">
        <p className="text-sm text-ghost-700">
          <span className="font-semibold text-purple-900">Drag</span> to rotate •{' '}
          <span className="font-semibold text-purple-900">Scroll</span> to zoom •{' '}
          <span className="font-semibold text-purple-900">Hover</span> over books for details •{' '}
          <span className="font-semibold text-purple-900">Click</span> to select
        </p>
      </div>

      {/* Debug info */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded border border-ghost-300 text-xs text-ghost-700 pointer-events-none z-10">
        {vendors.length} vendors loaded
      </div>
    </div>
  );
}
