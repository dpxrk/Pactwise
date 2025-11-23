
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Loader } from '@react-three/drei';
import { MainExperience } from './components/3d/MainExperience';
import { UIOverlay, AgentDetailPanel } from './components/UIOverlay';
import { COLORS, AGENTS } from './constants';
import { InteractionProvider, useInteraction } from './InteractionContext';

// Inner Layout Component allows access to context values
const AppLayout = () => {
  const { activeAgentId, setActiveAgentId } = useInteraction();
  const activeAgent = activeAgentId ? AGENTS.find(a => a.id === activeAgentId) : null;

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
          dpr={[1, 1.5]} 
          camera={{ position: [0, 0, 10], fov: 45, near: 0.1, far: 200 }}
        >
          <Suspense fallback={null}>
             {/* 
                ScrollControls enabled is toggled by activeAgentId. 
                When an agent is inspected, scrolling is effectively disabled, 
                preventing the user from leaving the view. 
             */}
             <ScrollControls pages={4} damping={0.2} enabled={!activeAgentId}>
                <MainExperience />
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
      
      {/* Grain Overlay */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-50 mix-blend-overlay opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      {/* 
        Agent Detail Modal 
        Rendered OUTSIDE the Canvas to ensure z-index superiority and 
        prevent clipping or transform issues from ScrollControls.
      */}
      {activeAgent && (
          <AgentDetailPanel 
              agent={activeAgent} 
              onClose={() => setActiveAgentId(null)} 
          />
      )}
    </>
  );
};

function App() {
  return (
    <InteractionProvider>
       <AppLayout />
    </InteractionProvider>
  );
}

export default App;
