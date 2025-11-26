"use client";

import React, { useRef, useEffect, forwardRef, useMemo } from 'react';
import { ChromaticAberrationEffect as ChromaticAberrationEffectImpl } from '../shaders/chromaticAberration';

interface ChromaticAberrationProps {
  offset?: [number, number];
  intensity?: number;
  radialFalloff?: number;
  blendFunction?: number;
}

export const ChromaticAberration = forwardRef<
  ChromaticAberrationEffectImpl,
  ChromaticAberrationProps
>(({ offset = [0.002, 0], intensity = 1, radialFalloff = 2 }, ref) => {
  const effect = useMemo(() => {
    const { Vector2 } = require('three');
    return new ChromaticAberrationEffectImpl({
      offset: new Vector2(offset[0], offset[1]),
      intensity,
      radialFalloff,
    });
  }, []);

  useEffect(() => {
    effect.setOffset(offset[0], offset[1]);
  }, [offset, effect]);

  useEffect(() => {
    effect.setIntensity(intensity);
  }, [intensity, effect]);

  useEffect(() => {
    effect.setRadialFalloff(radialFalloff);
  }, [radialFalloff, effect]);

  useEffect(() => {
    if (typeof ref === 'function') {
      ref(effect);
    } else if (ref) {
      ref.current = effect;
    }
  }, [effect, ref]);

  return <primitive object={effect} dispose={null} />;
});

ChromaticAberration.displayName = 'ChromaticAberration';

export default ChromaticAberration;
