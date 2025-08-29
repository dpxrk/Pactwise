'use client';

import { OrbitControls, Float, Text, Box, Sphere, MeshDistortMaterial } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import React, { useRef, useEffect, useState, Suspense } from 'react';
import * as THREE from 'three';

interface AnimatedBoxProps {
  position?: [number, number, number];
  color?: string;
}

const AnimatedBox: React.FC<AnimatedBoxProps> = ({ 
  position = [0, 0, 0], 
  color = '#111827' 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
      const scale = hovered ? 1.2 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });

  return (
    <Box
      ref={meshRef}
      position={position}
      args={[1, 1, 1]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial 
        color={color} 
        wireframe={!hovered}
        metalness={0.8}
        roughness={0.2}
      />
    </Box>
  );
};

interface FloatingParticlesProps {
  count?: number;
}

const FloatingParticles: React.FC<FloatingParticlesProps> = ({ count = 100 }) => {
  const points = useRef<THREE.Points>(null);
  
  const particlesPosition = React.useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.05;
      points.current.rotation.x = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#111827"
        sizeAttenuation
        transparent
        opacity={0.8}
      />
    </points>
  );
};

interface WaveGridProps {
  width?: number;
  height?: number;
  segments?: number;
}

const WaveGrid: React.FC<WaveGridProps> = ({ 
  width = 10, 
  height = 10, 
  segments = 20 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { clock } = useThree();

  useFrame(() => {
    if (meshRef.current && meshRef.current.geometry) {
      const geometry = meshRef.current.geometry as THREE.PlaneGeometry;
      const { position } = geometry.attributes;
      const time = clock.elapsedTime;

      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = Math.sin(x * 0.5 + time) * 0.3 + Math.cos(y * 0.5 + time) * 0.3;
        position.setZ(i, z);
      }
      position.needsUpdate = true;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[width, height, segments, segments]} />
      <meshStandardMaterial 
        color="#111827" 
        wireframe 
        side={THREE.DoubleSide}
        transparent
        opacity={0.3}
      />
    </mesh>
  );
};

interface DistortedSphereProps {
  position?: [number, number, number];
  color?: string;
}

const DistortedSphere: React.FC<DistortedSphereProps> = ({ 
  position = [0, 0, 0], 
  color = '#111827' 
}) => {
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.x = clock.elapsedTime * 0.2;
      sphereRef.current.rotation.y = clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere ref={sphereRef} args={[1, 32, 32]} position={position}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={0.3}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
};

export const ThreeBackground: React.FC<{
  className?: string;
  variant?: 'particles' | 'boxes' | 'waves' | 'spheres';
}> = ({ className = '', variant = 'particles' }) => {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          {variant === 'particles' && <FloatingParticles />}
          {variant === 'boxes' && (
            <>
              <AnimatedBox position={[-2, 0, 0]} />
              <AnimatedBox position={[2, 0, 0]} />
              <AnimatedBox position={[0, 2, 0]} />
              <AnimatedBox position={[0, -2, 0]} />
            </>
          )}
          {variant === 'waves' && <WaveGrid />}
          {variant === 'spheres' && (
            <>
              <DistortedSphere position={[-2, 0, 0]} />
              <DistortedSphere position={[2, 0, 0]} color="#374151" />
            </>
          )}
        </Suspense>
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};

export const InteractiveGlobe: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Float speed={1} rotationIntensity={1} floatIntensity={1}>
            <Sphere args={[1, 64, 64]}>
              <meshStandardMaterial
                color="#111827"
                roughness={0.1}
                metalness={0.9}
                wireframe
              />
            </Sphere>
          </Float>
        </Suspense>
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1} />
      </Canvas>
    </div>
  );
};