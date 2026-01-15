"use client";

import React, { useEffect, forwardRef, useMemo, useImperativeHandle } from 'react';

import { GlitchEffect as GlitchEffectImpl } from '../shaders/glitchEffect';

interface GlitchProps {
  intensity?: number;
  scanlineIntensity?: number;
  rgbSplit?: number;
  blockSize?: number;
}

export interface GlitchHandle {
  trigger: (duration?: number, intensity?: number) => void;
}

export const Glitch = forwardRef<GlitchHandle, GlitchProps>(
  (
    {
      intensity = 0,
      scanlineIntensity = 0.3,
      rgbSplit = 0.01,
      blockSize = 20,
    },
    ref
  ) => {
    const effect = useMemo(() => {
      return new GlitchEffectImpl({
        intensity,
        scanlineIntensity,
        rgbSplit,
        blockSize,
      });
    }, []);

    useImperativeHandle(ref, () => ({
      trigger: (duration = 300, triggerIntensity = 1) => {
        effect.trigger(duration, triggerIntensity);
      },
    }));

    useEffect(() => {
      effect.setIntensity(intensity);
    }, [intensity, effect]);

    useEffect(() => {
      effect.setScanlineIntensity(scanlineIntensity);
    }, [scanlineIntensity, effect]);

    useEffect(() => {
      effect.setRgbSplit(rgbSplit);
    }, [rgbSplit, effect]);

    return <primitive object={effect} dispose={null} />;
  }
);

Glitch.displayName = 'Glitch';

export default Glitch;
