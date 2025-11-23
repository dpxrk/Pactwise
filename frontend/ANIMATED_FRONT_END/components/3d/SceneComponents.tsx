
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, extend, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Line, Sphere, Box, TorusKnot, Octahedron, Icosahedron } from '@react-three/drei';
import { THREE_COLORS, COLORS } from '../../constants';
import { shaderMaterial } from '@react-three/drei';
import { useInteraction } from '../../InteractionContext';

// --- Custom Shaders (Unchanged) ---
const DataGridMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color(COLORS.primary),
    uDeep: new THREE.Color(COLORS.deep),
    uPulseSpeed: 0.5,
  },
  `
    varying vec2 vUv;
    varying float vElevation;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float elevation = sin(pos.x * 0.5 + uTime * 0.5) * cos(pos.y * 0.5 + uTime * 0.3) * 1.5;
      pos.z += elevation;
      vElevation = elevation;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uDeep;
    varying vec2 vUv;
    varying float vElevation;
    void main() {
      float gridX = step(0.98, fract(vUv.x * 30.0));
      float gridY = step(0.98, fract(vUv.y * 30.0));
      float grid = max(gridX, gridY);
      float pulse1 = step(0.95, fract(vUv.y * 5.0 - uTime * 0.5));
      float pulse2 = step(0.95, fract(vUv.x * 5.0 + uTime * 0.2));
      float combinedPulse = (pulse1 * gridY) + (pulse2 * gridX);
      vec3 finalColor = mix(uDeep, uColor, grid * 0.3);
      finalColor += uColor * combinedPulse * 2.0;
      finalColor += uColor * (vElevation * 0.1);
      float alpha = (grid + combinedPulse) * 0.8;
      float dist = length(vUv - 0.5) * 2.0;
      alpha *= (1.0 - smoothstep(0.5, 1.0, dist));
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
);
extend({ DataGridMaterial });

// --- Particle Flow (Unchanged) ---
export const ParticleFlow = ({ count = 200, radius = 5, speed = 0.1 }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const speedFactor = 0.01 + Math.random() * 0.04;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;
      temp.push({ t, speedFactor, xFactor, yFactor, zFactor });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    particles.forEach((particle, i) => {
      // eslint-disable-next-line
      let { t, speedFactor, xFactor, yFactor, zFactor } = particle;
      particle.t += speedFactor * speed; 
      t = particle.t;
      const s = Math.cos(t);
      dummy.position.set(
        (xFactor + Math.cos(t) * radius) + Math.sin(t * 2) * 2,
        (yFactor + Math.sin(t) * radius) + Math.cos(t * 1.5) * 2,
        (zFactor + Math.cos(t / 2) * radius) + Math.sin(t * 2) * 5
      );
      const scale = Math.abs(s) * 0.5 + 0.2;
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[0.05, 0]} />
      <meshBasicMaterial color={THREE_COLORS.highlight} transparent opacity={0.6} />
    </instancedMesh>
  );
};

// --- Specialized Agent Shapes ---

const AnalystShape = ({ color, active }: { color: string, active: boolean }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(ref.current) {
            ref.current.rotation.y += active ? 0.05 : 0.01;
            ref.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.1;
        }
    });
    return (
        <group ref={ref}>
             <Box args={[1.2, 1.2, 1.2]}>
                <meshStandardMaterial color={color} wireframe transparent opacity={active ? 0.8 : 0.3} />
             </Box>
             <Box args={[0.8, 0.8, 0.8]}>
                <meshStandardMaterial color={color} roughness={0.1} metalness={0.9} />
             </Box>
        </group>
    )
}

const IntelShape = ({ color, active }: { color: string, active: boolean }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(ref.current) ref.current.rotation.y -= active ? 0.05 : 0.02;
    });
    return (
        <group ref={ref}>
            <Icosahedron args={[0.8, 1]}>
                <meshBasicMaterial color={color} wireframe transparent opacity={active ? 0.8 : 0.4} />
            </Icosahedron>
            <Points>
                 <sphereGeometry args={[1.2, 16, 16]} />
                 <pointsMaterial color={color} size={0.05} transparent opacity={active ? 1 : 0.8} />
            </Points>
        </group>
    )
}
const Points = ({ children }: { children: React.ReactNode }) => {
    return <points>{children}</points>
}

const LegalShape = ({ color, active }: { color: string, active: boolean }) => {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if(ref.current) {
            ref.current.rotation.x += active ? 0.04 : 0.01;
            ref.current.rotation.z += active ? 0.05 : 0.02;
        }
    });
    return (
        <TorusKnot ref={ref} args={[0.6, 0.2, 128, 16]}>
            <meshStandardMaterial 
                color={color} 
                roughness={0.4} 
                metalness={0.6}
                wireframe
                emissive={color}
                emissiveIntensity={active ? 0.8 : 0.2}
            />
        </TorusKnot>
    )
}

const GuardianShape = ({ color, active }: { color: string, active: boolean }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(ref.current) {
             ref.current.rotation.y = Math.sin(state.clock.elapsedTime * (active ? 2 : 0.5)) * 0.5;
        }
    });
    return (
        <group ref={ref}>
            <Octahedron args={[1, 0]}>
                 <meshPhysicalMaterial 
                    color={color} 
                    transmission={0.6}
                    thickness={1}
                    roughness={0}
                    ior={1.5}
                 />
            </Octahedron>
            <Octahedron args={[1.1, 0]}>
                 <meshBasicMaterial color={color} wireframe transparent opacity={active ? 0.8 : 0.3} />
            </Octahedron>
        </group>
    )
}

// --- Main Agent Node Wrapper ---
interface AgentNodeProps {
    position: [number, number, number];
    color: string;
    label?: string;
    id: string;
}

export const AgentNode: React.FC<AgentNodeProps> = ({ position, color, label, id }) => {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHover] = useState(false);
  const { activeAgentId } = useInteraction(); // Removed setActiveAgentId since we don't click here anymore
  
  // Is this specific agent active?
  const isActive = activeAgentId === id;
  // Is any agent active?
  const isAnyActive = activeAgentId !== null;
  // Should this agent fade out because another one is active?
  const isDimmed = isAnyActive && !isActive;

  useFrame((state) => {
    if (ref.current) {
        const t = state.clock.getElapsedTime();
        // Floating animation
        // If dimmed, float less
        const floatIntensity = isActive ? 0.05 : 0.1;
        ref.current.position.y = THREE.MathUtils.lerp(
            ref.current.position.y,
            position[1] + Math.sin(t + position[0]) * floatIntensity,
            0.1
        );

        // Scale effect
        const targetScale = isActive ? 1.5 : (hovered ? 1.2 : (isDimmed ? 0.8 : 1.0));
        ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  const renderShape = () => {
      switch(id) {
          case '1': return <AnalystShape color={color} active={isActive || hovered} />;
          case '2': return <IntelShape color={color} active={isActive || hovered} />;
          case '3': return <LegalShape color={color} active={isActive || hovered} />;
          case '4': return <GuardianShape color={color} active={isActive || hovered} />;
          default: return <Box><meshStandardMaterial color={color} /></Box>;
      }
  }

  return (
    <group 
        ref={ref} 
        position={position}
        // Interaction Handlers updated: No onClick, no pointer cursor, but keep hover for subtle effect
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
    >
      {renderShape()}
      
      {/* Glow Halo */}
      <mesh position={[0,0,-0.5]} scale={[2,2,2]}>
         <planeGeometry />
         <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={isActive ? 0.3 : (isDimmed ? 0.05 : 0.1)} // Much lower opacity when dimmed
            side={THREE.DoubleSide}
            depthWrite={false}
         />
      </mesh>
    </group>
  );
};

// --- Connection Lines (Unchanged) ---
export const Connections = ({ positions }: { positions: [number, number, number][] }) => {
   const points = useMemo(() => {
     const pts = [];
     for(let i=0; i<positions.length; i++) {
        for(let j=i+1; j<positions.length; j++) {
            pts.push(new THREE.Vector3(...positions[i]));
            pts.push(new THREE.Vector3(...positions[j]));
        }
     }
     return pts;
   }, [positions]);

   return (
      <Line
        points={points}
        color={COLORS.primary}
        opacity={0.1}
        transparent
        lineWidth={1}
      />
   );
};

// --- Data Landscape (Unchanged) ---
export const DataLandscape = () => {
    const materialRef = useRef<any>(null);
    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uTime = state.clock.getElapsedTime();
        }
    });

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
            <planeGeometry args={[40, 40, 128, 128]} />
            {/* @ts-ignore */}
            <dataGridMaterial ref={materialRef} transparent side={THREE.DoubleSide} />
        </mesh>
    );
};
