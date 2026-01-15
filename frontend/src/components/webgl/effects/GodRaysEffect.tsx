"use client";

import React, { useEffect, forwardRef, useMemo } from 'react';
import { Vector2 } from 'three';

import { GodRaysEffect as GodRaysEffectImpl } from '../shaders/godRays';

interface GodRaysProps {
  lightPosition?: [number, number];
  exposure?: number;
  decay?: number;
  density?: number;
  weight?: number;
  intensity?: number;
  samples?: number;
  tint?: [number, number, number];
}

export const GodRays = forwardRef<GodRaysEffectImpl, GodRaysProps>(
  (
    {
      lightPosition = [0.5, 0.5],
      exposure = 0.3,
      decay = 0.96,
      density = 0.5,
      weight = 0.4,
      intensity = 1,
      samples = 60,
      tint = [0.8, 0.6, 1.0],
    },
    ref
  ) => {
    const effect = useMemo(() => {
      return new GodRaysEffectImpl({
        lightPosition: new Vector2(lightPosition[0], lightPosition[1]),
        exposure,
        decay,
        density,
        weight,
        intensity,
        samples,
        tint,
      });
    }, []);

    useEffect(() => {
      effect.setLightPosition(lightPosition[0], lightPosition[1]);
    }, [lightPosition, effect]);

    useEffect(() => {
      effect.setIntensity(intensity);
    }, [intensity, effect]);

    useEffect(() => {
      effect.setExposure(exposure);
    }, [exposure, effect]);

    useEffect(() => {
      effect.setDecay(decay);
    }, [decay, effect]);

    useEffect(() => {
      effect.setSamples(samples);
    }, [samples, effect]);

    useEffect(() => {
      effect.setTint(tint[0], tint[1], tint[2]);
    }, [tint, effect]);

    useEffect(() => {
      if (typeof ref === 'function') {
        ref(effect);
      } else if (ref) {
        ref.current = effect;
      }
    }, [effect, ref]);

    return <primitive object={effect} dispose={null} />;
  }
);

GodRays.displayName = 'GodRays';

export default GodRays;
