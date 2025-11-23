"use client";

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls } from '@react-three/drei';
import { MainExperience } from '@/components/webgl/scenes/animated/MainExperience';
import { UIOverlayAnimated } from '@/app/_components/landing/UIOverlayAnimated';

export default function AnimatedLandingPage() {
  return (
    <div className="w-full h-screen bg-purple-950">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        }}
      >
        <Suspense fallback={null}>
          <ScrollControls pages={4} damping={0.1}>
            <MainExperience />
            <UIOverlayAnimated />
          </ScrollControls>
        </Suspense>
      </Canvas>
    </div>
  );
}
