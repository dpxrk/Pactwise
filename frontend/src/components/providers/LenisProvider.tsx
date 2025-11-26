"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';

interface LenisContextType {
  lenis: Lenis | null;
  scrollProgress: number;
}

const LenisContext = createContext<LenisContextType>({ lenis: null, scrollProgress: 0 });

export const useLenis = () => useContext(LenisContext);

interface LenisProviderProps {
  children: React.ReactNode;
  options?: ConstructorParameters<typeof Lenis>[0];
}

export const LenisProvider: React.FC<LenisProviderProps> = ({ children, options }) => {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Use ref to store scroll progress to avoid re-renders during RAF
  const scrollProgressRef = useRef(0);

  useEffect(() => {
    const lenisInstance = new Lenis({
      // Longer duration = smoother, more inertia-based feel
      duration: 1.8,
      // Custom easing for ultra-smooth deceleration
      easing: (t) => 1 - Math.pow(1 - t, 4),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
      infinite: false,
      lerp: 0.075,
    });

    setLenis(lenisInstance);

    // Throttle scroll progress updates to prevent excessive re-renders
    let lastUpdate = 0;
    const THROTTLE_MS = 16; // ~60fps

    lenisInstance.on('scroll', ({ progress }: { progress: number }) => {
      scrollProgressRef.current = progress;
      const now = Date.now();
      if (now - lastUpdate >= THROTTLE_MS) {
        lastUpdate = now;
        setScrollProgress(progress);
      }
    });

    function raf(time: number) {
      lenisInstance.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    }

    rafRef.current = requestAnimationFrame(raf);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      lenisInstance.destroy();
    };
  }, []); // Empty deps - only initialize once

  return (
    <LenisContext.Provider value={{ lenis, scrollProgress }}>
      {children}
    </LenisContext.Provider>
  );
};
