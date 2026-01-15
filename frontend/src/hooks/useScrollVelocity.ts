"use client";

import { useRef, useEffect, useState, useCallback } from 'react';

import { useLenis } from '@/components/providers/LenisProvider';

interface ScrollVelocityState {
  velocity: number;           // -1 to 1 (negative = up, positive = down)
  speed: number;              // 0 to 1 absolute speed
  direction: 'up' | 'down' | 'idle';
  isScrolling: boolean;
  rawVelocity: number;        // Unclipped velocity for extreme effects
}

interface UseScrollVelocityOptions {
  smoothing?: number;         // 0-1, higher = more smoothing
  threshold?: number;         // Minimum velocity to register
  maxVelocity?: number;       // Maximum velocity for normalization
  idleTimeout?: number;       // ms before considered idle
}

/**
 * useScrollVelocity - Track scroll velocity for effect intensity
 *
 * Returns normalized velocity (-1 to 1) and absolute speed (0 to 1)
 * for use with chromatic aberration, motion blur, and other effects.
 */
export function useScrollVelocity(options: UseScrollVelocityOptions = {}): ScrollVelocityState {
  const {
    smoothing = 0.15,
    threshold = 0.001,
    maxVelocity = 0.05,
    idleTimeout = 150,
  } = options;

  const { scrollProgress } = useLenis();

  const [state, setState] = useState<ScrollVelocityState>({
    velocity: 0,
    speed: 0,
    direction: 'idle',
    isScrolling: false,
    rawVelocity: 0,
  });

  const lastProgressRef = useRef(scrollProgress);
  const lastTimeRef = useRef(Date.now());
  const smoothedVelocityRef = useRef(0);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const frameRef = useRef<number | null>(null);

  const updateVelocity = useCallback(() => {
    const now = Date.now();
    const deltaTime = (now - lastTimeRef.current) / 1000; // Convert to seconds
    const deltaProgress = scrollProgress - lastProgressRef.current;

    if (deltaTime > 0) {
      // Calculate raw velocity (progress per second)
      const rawVelocity = deltaProgress / deltaTime;

      // Apply exponential smoothing
      smoothedVelocityRef.current =
        smoothedVelocityRef.current * (1 - smoothing) + rawVelocity * smoothing;

      const absVelocity = Math.abs(smoothedVelocityRef.current);

      // Determine if scrolling
      const isScrolling = absVelocity > threshold;

      // Calculate normalized velocity (-1 to 1)
      const normalizedVelocity = Math.max(-1, Math.min(1,
        smoothedVelocityRef.current / maxVelocity
      ));

      // Calculate absolute speed (0 to 1)
      const speed = Math.min(1, absVelocity / maxVelocity);

      // Determine direction
      let direction: 'up' | 'down' | 'idle' = 'idle';
      if (isScrolling) {
        direction = smoothedVelocityRef.current > 0 ? 'down' : 'up';
      }

      setState({
        velocity: normalizedVelocity,
        speed,
        direction,
        isScrolling,
        rawVelocity: smoothedVelocityRef.current,
      });

      // Reset idle timer
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      if (isScrolling) {
        idleTimerRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            direction: 'idle',
            isScrolling: false,
          }));
        }, idleTimeout);
      }
    }

    lastProgressRef.current = scrollProgress;
    lastTimeRef.current = now;

    frameRef.current = requestAnimationFrame(updateVelocity);
  }, [scrollProgress, smoothing, threshold, maxVelocity, idleTimeout]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(updateVelocity);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [updateVelocity]);

  return state;
}

/**
 * useScrollVelocityEffect - Convenience hook for applying velocity to effects
 *
 * Returns a multiplier that can be applied directly to effect intensities.
 */
export function useScrollVelocityEffect(options: UseScrollVelocityOptions = {}) {
  const { speed, velocity, isScrolling, direction } = useScrollVelocity(options);

  return {
    // For chromatic aberration (increases with speed)
    chromaticOffset: speed * 0.005,

    // For motion blur (direction-aware)
    motionBlurX: velocity * 0.01,
    motionBlurY: 0,

    // For bloom intensity boost
    bloomBoost: speed * 0.3,

    // For particle turbulence
    particleTurbulence: speed * 2,

    // For vignette darkening
    vignetteDarkness: speed * 0.2,

    // Raw values
    speed,
    velocity,
    isScrolling,
    direction,
  };
}

export default useScrollVelocity;
