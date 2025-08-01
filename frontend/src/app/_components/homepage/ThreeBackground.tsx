'use client';

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  Points,
  Group,
  Mesh,
  Vector3,
  AdditiveBlending,
  BackSide
} from 'three';
import { Float, OrbitControls } from '@react-three/drei';

// Animated particle system with drifting motion
function AnimatedParticles() {
  const points = useRef<Points>(null);
  const particleCount = 300;
  const initialPositions = useRef<Float32Array>();
  
  const [positions, colors, sizes] = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Create particles in a spherical volume
      const radius = Math.random() * 40 + 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Teal color palette with variations
      const colorChoice = Math.random();
      if (colorChoice < 0.33) {
        colors[i3] = 0.063;
        colors[i3 + 1] = 0.725;
        colors[i3 + 2] = 0.506;
      } else if (colorChoice < 0.66) {
        colors[i3] = 0.08;
        colors[i3 + 1] = 0.722;
        colors[i3 + 2] = 0.651;
      } else {
        colors[i3] = 0.055;
        colors[i3 + 1] = 0.647;
        colors[i3 + 2] = 0.913;
      }
      
      sizes[i] = Math.random() * 1.5 + 0.3;
    }
    
    initialPositions.current = positions.slice();
    return [positions, colors, sizes];
  }, []);
  
  useFrame((state) => {
    if (points.current && initialPositions.current) {
      // Animate individual particle positions with drift
      const positions = points.current.geometry.attributes.position.array as Float32Array;
      const time = state.clock.elapsedTime;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const baseX = initialPositions.current[i3];
        const baseY = initialPositions.current[i3 + 1];
        const baseZ = initialPositions.current[i3 + 2];
        
        // Add drifting motion
        positions[i3] = baseX + Math.sin(time * 0.3 + i * 0.1) * 5;
        positions[i3 + 1] = baseY + Math.sin(time * 0.2 + i * 0.05) * 3;
        positions[i3 + 2] = baseZ + Math.cos(time * 0.25 + i * 0.08) * 4;
      }
      
      points.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={particleCount} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={particleCount} array={sizes} itemSize={1} />
      </bufferGeometry>
      <pointsMaterial
        size={0.8}
        vertexColors
        transparent
        opacity={0.3}
        sizeAttenuation
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Dynamic floating cubes with orbital motion
function FloatingCubes({ onCubeRef }: { onCubeRef: (ref: Mesh, index: number) => void }) {
  const groupRef = useRef<Group>(null);
  const cubeRefs = useRef<(Mesh | null)[]>([]);
  
  // Create an array of cube positions and properties with orbital paths
  const cubes = useMemo(() => [
    { 
      position: [-25, 10, -30], 
      scale: 3, 
      speed: 0.3, 
      color: "#10b981",
      orbitRadius: 10,
      orbitSpeed: 0.5,
      orbitOffset: 0
    },
    { 
      position: [20, -5, -25], 
      scale: 4, 
      speed: 0.4, 
      color: "#14b8a6",
      orbitRadius: 15,
      orbitSpeed: 0.3,
      orbitOffset: Math.PI / 3
    },
    { 
      position: [-15, -15, -35], 
      scale: 2.5, 
      speed: 0.2, 
      color: "#0ea5e9",
      orbitRadius: 8,
      orbitSpeed: 0.7,
      orbitOffset: Math.PI / 2
    },
    { 
      position: [30, 15, -40], 
      scale: 3.5, 
      speed: 0.5, 
      color: "#10b981",
      orbitRadius: 12,
      orbitSpeed: 0.4,
      orbitOffset: Math.PI
    },
    { 
      position: [0, 20, -45], 
      scale: 2, 
      speed: 0.3, 
      color: "#14b8a6",
      orbitRadius: 20,
      orbitSpeed: 0.2,
      orbitOffset: Math.PI * 1.5
    },
    { 
      position: [-30, 0, -30], 
      scale: 3, 
      speed: 0.35, 
      color: "#0ea5e9",
      orbitRadius: 18,
      orbitSpeed: 0.6,
      orbitOffset: Math.PI / 4
    },
  ], []);
  
  useFrame((state) => {
    cubes.forEach((cube, index) => {
      if (cubeRefs.current[index]) {
        const time = state.clock.elapsedTime;
        const mesh = cubeRefs.current[index];
        
        // Smoother orbital motion
        const orbitAngle = time * cube.orbitSpeed * 0.3 + cube.orbitOffset;
        const x = cube.position[0] + Math.cos(orbitAngle) * cube.orbitRadius;
        const z = cube.position[2] + Math.sin(orbitAngle) * cube.orbitRadius * 0.8;
        const y = cube.position[1] + Math.sin(time * cube.speed * 0.5) * 2;
        
        mesh!.position.set(x, y, z);
        
        // Slower rotation
        mesh!.rotation.x += 0.01 * cube.speed;
        mesh!.rotation.y += 0.008 * cube.speed;
      }
    });
  });
  
  return (
    <group ref={groupRef}>
      {cubes.map((cube, index) => (
        <mesh 
          key={index}
          position={cube.position} 
          scale={cube.scale}
          ref={(ref) => {
            cubeRefs.current[index] = ref;
            if (ref) onCubeRef(ref, index);
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial 
            color={cube.color} 
            wireframe 
            transparent 
            opacity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

// Small floating cube particles with drift motion
function SmallCubeParticles({ onCubeRef }: { onCubeRef: (ref: Mesh, index: number) => void }) {
  const groupRef = useRef<Group>(null);
  const cubeRefs = useRef<(Mesh | null)[]>([]);
  
  // Create small white/light colored cubes with drift motion
  const smallCubes = useMemo(() => {
    const cubes = [];
    for (let i = 0; i < 8; i++) {
      cubes.push({
        startPosition: [
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 50 - 20
        ],
        scale: Math.random() * 0.5 + 0.3,
        rotationSpeed: Math.random() * 0.02 + 0.01,
        driftSpeed: {
          x: (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.3,
          z: (Math.random() - 0.5) * 0.4
        },
        color: Math.random() > 0.5 ? "#ffffff" : "#e0f2fe"
      });
    }
    return cubes;
  }, []);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    smallCubes.forEach((cube, index) => {
      if (cubeRefs.current[index]) {
        const mesh = cubeRefs.current[index];
        
        // Gentler drift motion
        const x = cube.startPosition[0] + Math.sin(time * cube.driftSpeed.x * 0.5) * 5;
        const y = cube.startPosition[1] + Math.sin(time * cube.driftSpeed.y * 0.5) * 4;
        const z = cube.startPosition[2] + Math.cos(time * cube.driftSpeed.z * 0.5) * 6;
        
        mesh!.position.set(x, y, z);
        
        // Slower rotation
        mesh!.rotation.x += cube.rotationSpeed * 0.5;
        mesh!.rotation.y += cube.rotationSpeed * 0.7;
      }
    });
  });
  
  return (
    <group ref={groupRef}>
      {smallCubes.map((cube, index) => (
        <mesh 
          key={`small-${index}`}
          position={cube.startPosition} 
          scale={cube.scale}
          ref={(ref) => {
            cubeRefs.current[index] = ref;
            if (ref) onCubeRef(ref, index + 6);
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={cube.color}
            transparent
            opacity={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

// Dynamic connection lines based on cube proximity
function DynamicConnectionLines({ cubeRefs }: { cubeRefs: React.MutableRefObject<Mesh[]> }) {
  const linesRef = useRef<Group>(null);
  const frameCount = useRef(0);
  const [connections, setConnections] = useState<Array<[Vector3, Vector3]>>([]);
  const maxDistance = 12; // Maximum distance for connections
  
  useFrame(() => {
    frameCount.current++;
    
    // Only update connections every 10 frames for performance
    if (frameCount.current % 10 !== 0) return;
    
    if (!cubeRefs.current || cubeRefs.current.length === 0) return;
    
    const newConnections: Array<[Vector3, Vector3]> = [];
    const cubes = cubeRefs.current.filter(cube => cube !== null);
    
    // Limit connections to prevent performance issues
    let connectionCount = 0;
    const maxConnections = 10;
    
    // Check distances between all cube pairs
    for (let i = 0; i < cubes.length && connectionCount < maxConnections; i++) {
      for (let j = i + 1; j < cubes.length && connectionCount < maxConnections; j++) {
        if (cubes[i] && cubes[j]) {
          const pos1 = new Vector3();
          const pos2 = new Vector3();
          cubes[i].getWorldPosition(pos1);
          cubes[j].getWorldPosition(pos2);
          
          const distance = pos1.distanceTo(pos2);
          
          if (distance < maxDistance) {
            newConnections.push([pos1.clone(), pos2.clone()]);
            connectionCount++;
          }
        }
      }
    }
    
    setConnections(newConnections);
  });
  
  return (
    <group ref={linesRef}>
      {connections.map((points, index) => {
        const positions = new Float32Array([
          points[0].x, points[0].y, points[0].z,
          points[1].x, points[1].y, points[1].z
        ]);
        
        return (
          <line key={index}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={positions}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial 
              color="#0ea5e9" 
              transparent 
              opacity={0.3}
              blending={AdditiveBlending}
            />
          </line>
        );
      })}
    </group>
  );
}

// Background sphere - stationary
function BackgroundSphere() {
  const meshRef = useRef<Mesh>(null);
  
  // No rotation - keeping perspective stable
  
  return (
    <mesh ref={meshRef} scale={60} position={[0, 0, -60]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color="#051515"
        side={BackSide}
        transparent
        opacity={0.95}
      />
    </mesh>
  );
}

// Static grid to show we're not moving
function StaticGrid() {
  return (
    <gridHelper 
      args={[100, 20, "#0a4f4f", "#0a2a2a"]} 
      position={[0, -20, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

// Camera is now stationary
function CameraRig() {
  // No camera movement - we want to appear stationary
  return null;
}

export const ThreeBackground = () => {
  const [mounted, setMounted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const cubeRefs = useRef<Mesh[]>([]);
  
  const handleCubeRef = (ref: Mesh, index: number) => {
    if (ref) {
      cubeRefs.current[index] = ref;
    }
  };
  
  useEffect(() => {
    setMounted(true);
    return () => {
      // Cleanup
      cubeRefs.current = [];
    };
  }, []);
  
  if (!mounted) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{
          position: [0, 0, 40],
          fov: 60,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "default",
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
        onCreated={() => {
          setIsLoaded(true);
        }}
      >
        <Suspense fallback={null}>
          {/* Scene setup */}
          <color attach="background" args={["#030808"]} />
          <fog attach="fog" color="#051010" near={20} far={100} />
          
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <pointLight position={[30, 30, 30]} color="#10b981" intensity={1.5} />
          <pointLight position={[-30, -30, 30]} color="#14b8a6" intensity={1} />
          <pointLight position={[0, 0, 20]} color="#0ea5e9" intensity={0.8} />
          
          {/* 3D Components */}
          <BackgroundSphere />
          <StaticGrid />
          <FloatingCubes onCubeRef={handleCubeRef} />
          <SmallCubeParticles onCubeRef={handleCubeRef} />
          <DynamicConnectionLines cubeRefs={cubeRefs} />
        </Suspense>
      </Canvas>
      
      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />
      </div>
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 right-4 text-white/30 text-xs font-mono z-20">
          <div>Three.js: {isLoaded ? '✅ Loaded' : '⏳ Loading...'}</div>
        </div>
      )}
    </div>
  );
};