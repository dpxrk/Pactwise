"use client";
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

const DitherMaterial = shaderMaterial(
    {
        tDiffuse: null,
        uTime: 0.0,
        uThreshold: 0.5,
    },
    `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uThreshold;
        varying vec2 vUv;

        float dither(vec2 v, float variance) {
            return mod(v.x + v.y * variance, 1.0);
        }

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            float d = dither(gl_FragCoord.xy, 0.1);
            float final_color = gray > d ? 1.0 : 0.0;
            gl_FragColor = vec4(vec3(final_color), color.a);
        }
    `
);

extend({ DitherMaterial });

const SceneContent = () => {
    const groupRef = useRef<THREE.Group>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);

    const agentPositions = useMemo(() => [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2, 1, -1),
        new THREE.Vector3(-2, -1, 1),
        new THREE.Vector3(1, -1.5, -2),
        new THREE.Vector3(-1.5, 1.5, 2)
    ], []);

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.1;
        }
    });
    
    return (
        <>
            <OrbitControls enableDamping dampingFactor={0.05} minDistance={3} maxDistance={10} />
            <ambientLight intensity={0.2} />
            <pointLight position={[0, 0, 5]} intensity={0.8} />

            <group ref={groupRef}>
                {agentPositions.map((pos, i) => (
                    <mesh key={i} position={pos}>
                        <icosahedronGeometry args={[0.5, 0]} />
                        <meshStandardMaterial color={0x9370DB} roughness={0.4} metalness={0.8} />
                    </mesh>
                ))}
                {agentPositions.map((start, i) =>
                    agentPositions.slice(i + 1).map((end, j) => (
                        <line key={`${i}-${j}`}>
                            <bufferGeometry attach="geometry">
                                <bufferAttribute
                                    attach='attributes-position'
                                    array={new Float32Array([...start.toArray(), ...end.toArray()])}
                                    count={2}
                                    itemSize={3}
                                />
                            </bufferGeometry>
                            <lineBasicMaterial attach="material" color={0xffffff} transparent opacity={0.3} />
                        </line>
                    ))
                )}
            </group>
        </>
    );
};

const ThreeJSLanding = () => {
    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
                <SceneContent />
            </Canvas>
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'white',
                textAlign: 'center',
                zIndex: 2,
                pointerEvents: 'none'
            }}>
                <h1 style={{ fontSize: '4rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>Pactwise AI</h1>
                <p style={{ fontSize: '1.5rem', marginTop: '1rem', textShadow: '0 0 5px rgba(0,0,0,0.5)' }}>The Future of Contract-Vendor Repositories with AI Agents</p>
            </div>
        </div>
    );
};

export default ThreeJSLanding;
