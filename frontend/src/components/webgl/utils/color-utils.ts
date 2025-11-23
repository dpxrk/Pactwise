/**
 * Color Utilities for Pactwise Purple/Pink Brand Palette
 *
 * Provides color conversion and gradient utilities for WebGL shaders
 * following the Pactwise brand guidelines.
 */

import * as THREE from 'three';

/**
 * Pactwise Brand Color Palette
 * Purple/Pink gradient system for WebGL materials and shaders
 */
export const BRAND_COLORS = {
  // Primary Purple Shades
  purple: {
    50: '#faf5f9',
    100: '#f5ebf3',
    200: '#ead6e7',
    300: '#dab5d5',  // Light Purple - Accents
    400: '#c388bb',  // Light Pink - Bloom
    500: '#9e829c',  // Mountbatten Pink - Secondary accent
    600: '#7d5c7b',  // Medium Purple
    700: '#644862',  // Purple variant
    800: '#533e52',  // Dark Purple variant
    900: '#291528',  // Dark Purple - Primary brand
    950: '#1a0d18',  // Deepest purple
  },
  // Ghost Neutral Shades
  ghost: {
    50: '#ffffff',   // Pure white
    100: '#f0eff4',  // Ghost white - Main background
    200: '#e1e0e9',
    300: '#d2d1de',
    400: '#a9a8b5',
    500: '#80808c',
    600: '#5a5a66',
    700: '#3a3e3b',  // Black Olive - Body text
    800: '#2a2a2a',
    900: '#1a1a1a',
    950: '#0a0a0a',
  }
} as const;

/**
 * Convert hex color to THREE.Color
 */
export function hexToThreeColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

/**
 * Convert hex color to RGB vector [0-1 range] for shaders
 */
export function hexToRGB(hex: string): [number, number, number] {
  const color = new THREE.Color(hex);
  return [color.r, color.g, color.b];
}

/**
 * Convert hex color to RGB vector [0-255 range]
 */
export function hexToRGB255(hex: string): [number, number, number] {
  const [r, g, b] = hexToRGB(hex);
  return [r * 255, g * 255, b * 255];
}

/**
 * Purple/Pink gradient stops for artistic dithering
 * Maps from dark purple to light pink to ghost white
 */
export const PURPLE_PINK_GRADIENT: ReadonlyArray<{ stop: number; color: string }> = [
  { stop: 0.0, color: BRAND_COLORS.purple[950] },  // Deepest purple
  { stop: 0.2, color: BRAND_COLORS.purple[900] },  // Dark purple
  { stop: 0.4, color: BRAND_COLORS.purple[600] },  // Medium purple
  { stop: 0.6, color: BRAND_COLORS.purple[500] },  // Mountbatten pink
  { stop: 0.8, color: BRAND_COLORS.purple[300] },  // Light purple
  { stop: 1.0, color: BRAND_COLORS.ghost[100] },   // Ghost white
];

/**
 * Create gradient texture for color grading LUT
 * Used in post-processing for purple/pink color mapping
 */
export function createGradientTexture(
  width: number = 256,
  height: number = 1,
  gradientStops = PURPLE_PINK_GRADIENT
): THREE.DataTexture {
  const size = width * height;
  const data = new Uint8Array(3 * size);

  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);

    // Find gradient segment
    let color1 = gradientStops[0].color;
    let color2 = gradientStops[1].color;
    let segmentT = 0;

    for (let j = 0; j < gradientStops.length - 1; j++) {
      const stop1 = gradientStops[j];
      const stop2 = gradientStops[j + 1];

      if (t >= stop1.stop && t <= stop2.stop) {
        color1 = stop1.color;
        color2 = stop2.color;
        segmentT = (t - stop1.stop) / (stop2.stop - stop1.stop);
        break;
      }
    }

    const [r1, g1, b1] = hexToRGB255(color1);
    const [r2, g2, b2] = hexToRGB255(color2);

    // Linear interpolation
    const stride = i * 3;
    data[stride] = Math.round(r1 + (r2 - r1) * segmentT);
    data[stride + 1] = Math.round(g1 + (g2 - g1) * segmentT);
    data[stride + 2] = Math.round(b1 + (b2 - b1) * segmentT);
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  return texture;
}

/**
 * Agent-specific brand colors for AI agent visualizations
 */
export const AGENT_COLORS = {
  contractAnalyst: hexToThreeColor(BRAND_COLORS.purple[900]),   // Dark purple
  vendorIntelligence: hexToThreeColor(BRAND_COLORS.purple[500]), // Mountbatten pink
  legalOperations: hexToThreeColor(BRAND_COLORS.purple[800]),    // Dark purple variant
  complianceGuardian: hexToThreeColor(BRAND_COLORS.purple[600]), // Medium purple
} as const;

/**
 * Semantic colors for data visualization (still using purple/pink palette)
 */
export const DATA_VIZ_COLORS = {
  chart1: hexToThreeColor(BRAND_COLORS.purple[900]),  // Primary data series
  chart2: hexToThreeColor(BRAND_COLORS.purple[500]),  // Secondary data series
  chart3: hexToThreeColor(BRAND_COLORS.purple[300]),  // Tertiary data series
  chart4: hexToThreeColor(BRAND_COLORS.purple[600]),  // Quaternary data series
  chart5: hexToThreeColor(BRAND_COLORS.purple[700]),  // Quinary data series
} as const;

/**
 * Lerp between two THREE.Color objects
 */
export function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  const result = new THREE.Color();
  result.r = color1.r + (color2.r - color1.r) * t;
  result.g = color1.g + (color2.g - color1.g) * t;
  result.b = color1.b + (color2.b - color1.b) * t;
  return result;
}

/**
 * Get color from purple/pink gradient based on t [0-1]
 */
export function getGradientColor(t: number): THREE.Color {
  const clampedT = Math.max(0, Math.min(1, t));

  for (let i = 0; i < PURPLE_PINK_GRADIENT.length - 1; i++) {
    const stop1 = PURPLE_PINK_GRADIENT[i];
    const stop2 = PURPLE_PINK_GRADIENT[i + 1];

    if (clampedT >= stop1.stop && clampedT <= stop2.stop) {
      const segmentT = (clampedT - stop1.stop) / (stop2.stop - stop1.stop);
      const color1 = hexToThreeColor(stop1.color);
      const color2 = hexToThreeColor(stop2.color);
      return lerpColor(color1, color2, segmentT);
    }
  }

  return hexToThreeColor(BRAND_COLORS.ghost[100]);
}

/**
 * Background/atmosphere colors
 */
export const SCENE_COLORS = {
  deepSpace: hexToThreeColor(BRAND_COLORS.purple[950]),    // Deep space background
  atmosphere: hexToThreeColor(BRAND_COLORS.purple[900]),   // Atmospheric fog
  highlight: hexToThreeColor(BRAND_COLORS.purple[300]),    // Highlight accents
  glow: hexToThreeColor(BRAND_COLORS.purple[400]),         // Bloom/glow color
} as const;
