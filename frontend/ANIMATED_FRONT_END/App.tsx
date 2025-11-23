import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Loader } from '@react-three/drei';
import { MainExperience } from './components/3d/MainExperience';
import { UIOverlay } from './components/UIOverlay';
import { COLORS } from './constants';

function App() {
  return (
    <>
      <div className="w-full h-screen bg-[#291528]">
        <Canvas
          gl={{ 
            antialias: false, 
            stencil: false, 
            depth: true,
            powerPreference: "high-performance" 
          }}
          dpr={[1, 1.5]} // Limit pixel ratio for performance with heavy shaders
          camera={{ position: [0, 0, 10], fov: 45, near: 0.1, far: 200 }}
        >
          <Suspense fallback={null}>
            <ScrollControls pages={4} damping={0.2}>
              {/* 3D Content */}
              <MainExperience />
              
              {/* HTML Overlay Content */}
              <UIOverlay />
            </ScrollControls>
          </Suspense>
        </Canvas>
        
        {/* Loading Screen */}
        <Loader 
          containerStyles={{ background: COLORS.deep }}
          innerStyles={{ background: COLORS.deep, border: `1px solid ${COLORS.primary}`, width: '200px', height: '10px' }}
          barStyles={{ background: COLORS.highlight, height: '100%' }}
          dataStyles={{ fontFamily: 'JetBrains Mono', color: COLORS.highlight, fontSize: '12px' }}
          dataInterpolation={(p) => `LOADING SYSTEM... ${p.toFixed(0)}%`}
        />
      </div>
      
      {/* SVG Filters or Global styles if needed, mostly handled by Tailwind and Three */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-50 mix-blend-overlay opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
    </>
  );
}

export default App;
