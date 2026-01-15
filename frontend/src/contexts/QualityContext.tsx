"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';

import {
  PerformanceTier,
  QualitySettings,
  QUALITY_PRESETS,
  detectPerformanceTier,
  FPSMonitor,
} from '@/components/webgl/utils/performance';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

// Extended quality settings for landing page 3D scene
export interface LandingQualitySettings extends QualitySettings {
  // Digital Rain
  digitalRainColumns: number;
  digitalRainParticlesPerColumn: number;
  // Stars
  starsCount: number;
  // Particle Flow
  particleFlowCount: number;
  // Data Landscape
  dataLandscapeSubdivisions: number;
  // Neural Core
  neuralCoreRingSegments: number;
  neuralCoreBurstParticles: number;
  // Agent shapes LOD level (0 = simplified, 1 = medium, 2 = full)
  agentLODLevel: 0 | 1 | 2;
  // Post-processing
  enableVignette: boolean;
  enableNoise: boolean;
}

// Quality presets for landing page
export const LANDING_QUALITY_PRESETS: Record<PerformanceTier, LandingQualitySettings> = {
  [PerformanceTier.LOW]: {
    ...QUALITY_PRESETS[PerformanceTier.LOW],
    digitalRainColumns: 10,
    digitalRainParticlesPerColumn: 8,
    starsCount: 1000,
    particleFlowCount: 100,
    dataLandscapeSubdivisions: 16,
    neuralCoreRingSegments: 32,
    neuralCoreBurstParticles: 30,
    agentLODLevel: 0,
    enableVignette: false,
    enableNoise: false,
  },
  [PerformanceTier.MEDIUM]: {
    ...QUALITY_PRESETS[PerformanceTier.MEDIUM],
    digitalRainColumns: 15,
    digitalRainParticlesPerColumn: 10,
    starsCount: 2000,
    particleFlowCount: 200,
    dataLandscapeSubdivisions: 32,
    neuralCoreRingSegments: 48,
    neuralCoreBurstParticles: 50,
    agentLODLevel: 1,
    enableVignette: true,
    enableNoise: false,
  },
  [PerformanceTier.HIGH]: {
    ...QUALITY_PRESETS[PerformanceTier.HIGH],
    digitalRainColumns: 25,
    digitalRainParticlesPerColumn: 15,
    starsCount: 4000,
    particleFlowCount: 300,
    dataLandscapeSubdivisions: 48,
    neuralCoreRingSegments: 64,
    neuralCoreBurstParticles: 100,
    agentLODLevel: 2,
    enableVignette: true,
    enableNoise: true,
  },
  [PerformanceTier.ULTRA]: {
    ...QUALITY_PRESETS[PerformanceTier.ULTRA],
    digitalRainColumns: 30,
    digitalRainParticlesPerColumn: 20,
    starsCount: 5000,
    particleFlowCount: 400,
    dataLandscapeSubdivisions: 64,
    neuralCoreRingSegments: 96,
    neuralCoreBurstParticles: 150,
    agentLODLevel: 2,
    enableVignette: true,
    enableNoise: true,
  },
};

// Aggressive FPS thresholds (user preference)
const FPS_DROP_THRESHOLD = 35;
const FPS_DROP_DURATION_MS = 1500; // 1.5 seconds
const FPS_INCREASE_THRESHOLD = 50;
const FPS_INCREASE_DURATION_MS = 3000; // 3 seconds

const STORAGE_KEY = 'pactwise-quality-tier';

interface QualityContextState {
  tier: PerformanceTier;
  settings: LandingQualitySettings;
  fps: number;
  reducedMotion: boolean;
  setTier: (tier: PerformanceTier) => void;
  baselineTier: PerformanceTier;
}

const QualityContext = createContext<QualityContextState | undefined>(undefined);

interface QualityProviderProps {
  children: ReactNode;
  enableAdaptiveQuality?: boolean;
}

export const QualityProvider: React.FC<QualityProviderProps> = ({
  children,
  enableAdaptiveQuality = true,
}) => {
  const reducedMotion = usePrefersReducedMotion();

  // Detect baseline tier on mount
  const [baselineTier, setBaselineTier] = useState<PerformanceTier>(PerformanceTier.HIGH);
  const [tier, setTierState] = useState<PerformanceTier>(PerformanceTier.HIGH);
  const [fps, setFps] = useState(60);

  // Refs for FPS monitoring
  const fpsMonitorRef = useRef<FPSMonitor | null>(null);
  const lowFpsStartRef = useRef<number | null>(null);
  const highFpsStartRef = useRef<number | null>(null);
  const frameIdRef = useRef<number | null>(null);

  // Initialize on mount
  useEffect(() => {
    // Check localStorage for stored tier
    const storedTier = localStorage.getItem(STORAGE_KEY) as PerformanceTier | null;
    const detectedTier = detectPerformanceTier();

    // Use stored tier if valid, otherwise detect
    const initialTier = storedTier && Object.values(PerformanceTier).includes(storedTier)
      ? storedTier
      : detectedTier;

    setBaselineTier(detectedTier);
    setTierState(initialTier);

    // Initialize FPS monitor
    fpsMonitorRef.current = new FPSMonitor((currentFps) => {
      setFps(currentFps);
    });
  }, []);

  // Set tier and persist to localStorage
  const setTier = useCallback((newTier: PerformanceTier) => {
    setTierState(newTier);
    localStorage.setItem(STORAGE_KEY, newTier);
  }, []);

  // Aggressive adaptive quality monitoring
  useEffect(() => {
    if (!enableAdaptiveQuality || typeof window === 'undefined') {
      return;
    }

    const monitor = () => {
      if (fpsMonitorRef.current) {
        const currentFps = fpsMonitorRef.current.update();
        const now = performance.now();

        // Check for low FPS (aggressive: < 35 for 1.5s)
        if (currentFps < FPS_DROP_THRESHOLD) {
          if (lowFpsStartRef.current === null) {
            lowFpsStartRef.current = now;
          } else if (now - lowFpsStartRef.current > FPS_DROP_DURATION_MS) {
            // Drop tier
            const tiers = Object.values(PerformanceTier);
            const currentIndex = tiers.indexOf(tier);
            if (currentIndex > 0) {
              const newTier = tiers[currentIndex - 1];
              setTier(newTier);
              lowFpsStartRef.current = null;
              highFpsStartRef.current = null;
            }
          }
        } else {
          lowFpsStartRef.current = null;
        }

        // Check for high FPS (increase at > 50 for 3s)
        if (currentFps > FPS_INCREASE_THRESHOLD) {
          if (highFpsStartRef.current === null) {
            highFpsStartRef.current = now;
          } else if (now - highFpsStartRef.current > FPS_INCREASE_DURATION_MS) {
            // Increase tier (but not beyond baseline)
            const tiers = Object.values(PerformanceTier);
            const currentIndex = tiers.indexOf(tier);
            const baselineIndex = tiers.indexOf(baselineTier);
            if (currentIndex < tiers.length - 1 && currentIndex < baselineIndex) {
              const newTier = tiers[currentIndex + 1];
              setTier(newTier);
              highFpsStartRef.current = null;
              lowFpsStartRef.current = null;
            }
          }
        } else {
          highFpsStartRef.current = null;
        }
      }

      frameIdRef.current = requestAnimationFrame(monitor);
    };

    frameIdRef.current = requestAnimationFrame(monitor);

    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [enableAdaptiveQuality, tier, baselineTier, setTier]);

  const settings = LANDING_QUALITY_PRESETS[tier];

  return (
    <QualityContext.Provider
      value={{
        tier,
        settings,
        fps,
        reducedMotion,
        setTier,
        baselineTier,
      }}
    >
      {children}
    </QualityContext.Provider>
  );
};

export const useQuality = (): QualityContextState => {
  const context = useContext(QualityContext);
  if (!context) {
    throw new Error('useQuality must be used within a QualityProvider');
  }
  return context;
};

// Convenience hook for just the tier
export const useQualityTier = (): PerformanceTier => {
  const { tier } = useQuality();
  return tier;
};

// Convenience hook for settings
export const useQualitySettings = (): LandingQualitySettings => {
  const { settings } = useQuality();
  return settings;
};
