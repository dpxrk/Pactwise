'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Mesh, Points } from 'three';

// Simple animated sphere
function AnimatedSphere() {
  const mesh = useRef<Mesh>(null);
  
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.elapsedTime * 0.3;
      mesh.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });
  
  return (
    <mesh ref={mesh} scale={3}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        color="#10b981" 
        wireframe 
        emissive="#10b981"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

// Simple particle field
function SimpleParticles() {
  const points = useRef<Points>(null);
  const particleCount = 100;
  
  const positions = React.useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return positions;
  }, []);
  
  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });
  
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={particleCount} 
          array={positions} 
          itemSize={3} 
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.1} 
        color="#14b8a6" 
        transparent 
        opacity={0.6} 
        sizeAttenuation 
      />
    </points>
  );
}

export const SimpleThreeBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0" style={{ zIndex: -1 }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#030808] via-[#0d1f1f] to-[#051010]" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: -1 }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        style={{ background: '#030808' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} color="#10b981" intensity={1} />
        <pointLight position={[-10, -10, 10]} color="#14b8a6" intensity={0.5} />
        
        <AnimatedSphere />
        <SimpleParticles />
      </Canvas>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
      </div>
    </div>
  );
};