"use client";

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const COLORS = {
  deep: '#291528',
  primary: '#9e829c',
  highlight: '#dab5d5',
  white: '#f0eff4',
  bloom: '#c388bb',
};

interface DigitalRainProps {
  scrollProgress: number;
  columns?: number;
  particlesPerColumn?: number;
  opacity?: number;
}

interface RainParticle {
  column: number;
  speed: number;
  offset: number;
  size: number;
  colorIndex: number;
}

export const DigitalRain: React.FC<DigitalRainProps> = ({
  scrollProgress,
  columns = 30,
  particlesPerColumn = 15,
  opacity = 0.3,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport } = useThree();

  // Color palette for particles
  const colorPalette = useMemo(() => [
    new THREE.Color(COLORS.primary),
    new THREE.Color(COLORS.highlight),
    new THREE.Color(COLORS.bloom),
    new THREE.Color(COLORS.white),
  ], []);

  // Generate particles data
  const { positions, colors, particleData } = useMemo(() => {
    const count = columns * particlesPerColumn;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const data: RainParticle[] = [];

    const columnSpacing = 1.5;
    const startX = -((columns - 1) * columnSpacing) / 2;

    for (let c = 0; c < columns; c++) {
      for (let p = 0; p < particlesPerColumn; p++) {
        const i = c * particlesPerColumn + p;

        // Initial positions - spread across Y axis
        const x = startX + c * columnSpacing + (Math.random() - 0.5) * 0.3;
        const y = Math.random() * 20 - 10; // Random starting Y
        const z = -5 + Math.random() * 2; // Behind other elements

        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;

        // Particle metadata
        const colorIndex = Math.floor(Math.random() * colorPalette.length);
        const color = colorPalette[colorIndex];
        col[i * 3] = color.r;
        col[i * 3 + 1] = color.g;
        col[i * 3 + 2] = color.b;

        data.push({
          column: c,
          speed: 0.02 + Math.random() * 0.04, // Varying fall speeds
          offset: Math.random() * 100, // Phase offset
          size: 0.05 + Math.random() * 0.1, // Varying sizes
          colorIndex,
        });
      }
    }

    return { positions: pos, colors: col, particleData: data };
  }, [columns, particlesPerColumn, colorPalette]);

  // Animate particles
  useFrame((state) => {
    if (!pointsRef.current) return;

    const posAttr = pointsRef.current.geometry.attributes.position;
    const t = state.clock.getElapsedTime();

    // Intensity varies with scroll - brighter during transitions
    const transitionIntensity = Math.sin(scrollProgress * Math.PI * 4) * 0.3 + 0.7;

    for (let i = 0; i < particleData.length; i++) {
      const particle = particleData[i];

      // Get current Y
      let y = posAttr.getY(i);

      // Move down
      y -= particle.speed * transitionIntensity;

      // Reset when off screen
      if (y < -10) {
        y = 10 + Math.random() * 2;
      }

      // Add subtle wave motion
      const x = posAttr.getX(i);
      const newX = x + Math.sin(t * 0.5 + particle.offset) * 0.001;

      posAttr.setY(i, y);
      posAttr.setX(i, newX);
    }

    posAttr.needsUpdate = true;

    // Update material opacity based on scroll and base opacity
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = opacity * transitionIntensity;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Enhanced version with glyph-like trails
export const DigitalRainTrails: React.FC<DigitalRainProps> = ({
  scrollProgress,
  columns = 25,
  particlesPerColumn = 20,
  opacity = 0.25,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  // Create line segments for trailing effect
  const trails = useMemo(() => {
    const trailData: Array<{
      startX: number;
      speed: number;
      length: number;
      offset: number;
      color: THREE.Color;
    }> = [];

    const columnSpacing = viewport.width / columns;
    const startX = -viewport.width / 2;

    for (let c = 0; c < columns; c++) {
      trailData.push({
        startX: startX + c * columnSpacing + (Math.random() - 0.5) * 0.5,
        speed: 0.03 + Math.random() * 0.05,
        length: 1 + Math.random() * 2,
        offset: Math.random() * 100,
        color: new THREE.Color().setHSL(
          0.8 + Math.random() * 0.1, // Purple hue range
          0.4 + Math.random() * 0.2,
          0.5 + Math.random() * 0.3
        ),
      });
    }

    return trailData;
  }, [columns, viewport.width]);

  return (
    <group ref={groupRef} position={[0, 0, -8]}>
      <DigitalRain
        scrollProgress={scrollProgress}
        columns={columns}
        particlesPerColumn={particlesPerColumn}
        opacity={opacity}
      />
    </group>
  );
};

export default DigitalRain;
