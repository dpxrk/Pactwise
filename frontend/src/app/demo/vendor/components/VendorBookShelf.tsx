'use client';

// Removed Text import to avoid CSP worker issues
import VendorBook from './VendorBook';
import type { Shelf3DProps } from '../types';

export default function VendorBookShelf({
  vendors,
  category,
  position,
  onVendorClick,
  highlightedVendorIds = [],
  selectedVendor
}: Shelf3DProps) {
  const shelfWidth = 8;
  const shelfHeight = 0.1;
  const shelfDepth = 1.2;
  const backboardHeight = 2;

  // Calculate book positions
  const booksPerShelf = Math.min(vendors.length, 10); // Max 10 books per shelf row
  const spacing = shelfWidth / (booksPerShelf + 1);

  return (
    <group position={position}>
      {/* Shelf Label removed - will use HTML overlay */}

      {/* Backboard */}
      <mesh position={[0, backboardHeight / 2, -shelfDepth / 2]}>
        <boxGeometry args={[shelfWidth, backboardHeight, 0.05]} />
        <meshStandardMaterial
          color="#291528"
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Shelf surface */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[shelfWidth, shelfHeight, shelfDepth]} />
        <meshStandardMaterial
          color="#291528"
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>

      {/* Shelf edge (decorative) */}
      <mesh position={[0, -shelfHeight / 2 - 0.02, shelfDepth / 2]}>
        <boxGeometry args={[shelfWidth, 0.04, 0.04]} />
        <meshStandardMaterial
          color="#9e829c"
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>

      {/* Left support */}
      <mesh position={[-shelfWidth / 2, backboardHeight / 2, 0]}>
        <boxGeometry args={[0.1, backboardHeight, shelfDepth]} />
        <meshStandardMaterial
          color="#291528"
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Right support */}
      <mesh position={[shelfWidth / 2, backboardHeight / 2, 0]}>
        <boxGeometry args={[0.1, backboardHeight, shelfDepth]} />
        <meshStandardMaterial
          color="#291528"
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Books */}
      {vendors.map((vendor, index) => {
        // Calculate position for each book
        const row = Math.floor(index / booksPerShelf);
        const col = index % booksPerShelf;
        const x = -shelfWidth / 2 + spacing * (col + 1);
        const y = shelfHeight / 2 + 0.75; // Center books on shelf
        const z = -shelfDepth / 2 + 0.6; // Position books in front of backboard

        const isHighlighted = highlightedVendorIds.includes(vendor.id);
        const isSelected = selectedVendor?.id === vendor.id;

        // Slight rotation variation for more natural look
        const rotationVariation = (Math.sin(index) * 0.05);

        return (
          <group
            key={vendor.id}
            rotation={[0, rotationVariation, 0]}
          >
            <VendorBook
              vendor={vendor}
              position={[x, y, z]}
              onClick={onVendorClick}
              isHighlighted={isHighlighted}
              isSelected={isSelected}
            />
          </group>
        );
      })}

      {/* Vendor count badge - just the circle, no text */}
      <group position={[shelfWidth / 2 - 0.5, backboardHeight / 2 + 0.3, 0.1]}>
        <mesh>
          <circleGeometry args={[0.15, 32]} />
          <meshStandardMaterial
            color="#9e829c"
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
      </group>
    </group>
  );
}
