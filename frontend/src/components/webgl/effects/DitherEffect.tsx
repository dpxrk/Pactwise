"use client";

import React, { forwardRef, useMemo, useEffect } from 'react';
import { Effect } from 'postprocessing';
import { Uniform } from 'three';
import * as THREE from 'three';

const COLORS = {
  deep: '#291528',
  primary: '#9e829c',
  highlight: '#dab5d5',
  white: '#f0eff4',
};

// GLSL Fragment Shader for Artistic Dithering
const ditherFragmentShader = `
uniform vec3 uColor1; // Deep
uniform vec3 uColor2; // Primary
uniform vec3 uColor3; // Highlight
uniform vec3 uColor4; // White
uniform float uTime;

float getBayerValue(int x, int y) {
    int i = int(mod(float(x), 4.0));
    int j = int(mod(float(y), 4.0));
    int idx = i + j * 4;

    // Hardcoded 4x4 Bayer Matrix to avoid array constructor issues in some GLSL versions
    if (idx == 0) return 0.0/16.0;
    if (idx == 1) return 8.0/16.0;
    if (idx == 2) return 2.0/16.0;
    if (idx == 3) return 10.0/16.0;
    if (idx == 4) return 12.0/16.0;
    if (idx == 5) return 4.0/16.0;
    if (idx == 6) return 14.0/16.0;
    if (idx == 7) return 6.0/16.0;
    if (idx == 8) return 3.0/16.0;
    if (idx == 9) return 11.0/16.0;
    if (idx == 10) return 1.0/16.0;
    if (idx == 11) return 9.0/16.0;
    if (idx == 12) return 15.0/16.0;
    if (idx == 13) return 7.0/16.0;
    if (idx == 14) return 13.0/16.0;
    return 5.0/16.0;
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Use gl_FragCoord for pixel-perfect dithering
    vec2 fragCoord = gl_FragCoord.xy;
    int x = int(fragCoord.x);
    int y = int(fragCoord.y);

    float lum = luma(inputColor.rgb);

    // Add subtle noise
    float noise = fract(sin(dot(uv, vec2(12.9898, 78.233) + uTime)) * 43758.5453);
    lum += (noise * 0.03);

    float step1 = 0.15;
    float step2 = 0.40;
    float step3 = 0.70;

    vec3 finalColor = uColor1;
    float bayerVal = getBayerValue(x, y);

    // Dithering Logic
    if (lum < step1) {
        finalColor = uColor1;
    } else if (lum < step2) {
        float t = (lum - step1) / (step2 - step1);
        finalColor = (t > bayerVal) ? uColor2 : uColor1;
    } else if (lum < step3) {
        float t = (lum - step2) / (step3 - step2);
        finalColor = (t > bayerVal) ? uColor3 : uColor2;
    } else {
        float t = (lum - step3) / (1.0 - step3);
        finalColor = (t > bayerVal) ? uColor4 : uColor3;
    }

    outputColor = vec4(finalColor, 1.0);
}
`;

class DitherEffectImpl extends Effect {
  constructor() {
    super('DitherEffect', ditherFragmentShader, {
      uniforms: new Map<string, Uniform<unknown>>([
        ['uColor1', new Uniform(new THREE.Color(COLORS.deep))],
        ['uColor2', new Uniform(new THREE.Color(COLORS.primary))],
        ['uColor3', new Uniform(new THREE.Color(COLORS.highlight))],
        ['uColor4', new Uniform(new THREE.Color(COLORS.white))],
        ['uTime', new Uniform(0)],
      ]),
    });
  }

  update(_renderer: unknown, _inputBuffer: unknown, deltaTime: number) {
    const uniforms = (this as { uniforms: Map<string, Uniform<number>> }).uniforms;
    const uTime = uniforms.get('uTime');
    if (uTime) {
      uTime.value += deltaTime * 0.5;
    }
  }
}

// React Wrapper
export const DitherEffect = forwardRef<Effect>((_, ref) => {
  const effect = useMemo(() => new DitherEffectImpl(), []);

  useEffect(() => {
    // Ensure uniforms are updated if constants change (Hot Reload support)
    const c1 = new THREE.Color(COLORS.deep);
    const c2 = new THREE.Color(COLORS.primary);
    const c3 = new THREE.Color(COLORS.highlight);
    const c4 = new THREE.Color(COLORS.white);

    const uniforms = (effect as { uniforms: Map<string, Uniform<THREE.Color>> }).uniforms;
    uniforms.get('uColor1')?.value.set(c1.r, c1.g, c1.b);
    uniforms.get('uColor2')?.value.set(c2.r, c2.g, c2.b);
    uniforms.get('uColor3')?.value.set(c3.r, c3.g, c3.b);
    uniforms.get('uColor4')?.value.set(c4.r, c4.g, c4.b);
  }, [effect]);

  return <primitive object={effect} ref={ref} dispose={null} />;
});

DitherEffect.displayName = 'DitherEffect';
