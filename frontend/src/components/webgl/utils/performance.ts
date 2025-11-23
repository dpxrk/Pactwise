/**
 * Performance Utilities for WebGL Scenes
 *
 * Utilities for performance monitoring, optimization, and adaptive quality
 */

import * as THREE from 'three';

/**
 * Performance tier based on device capabilities
 */
export enum PerformanceTier {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

/**
 * Quality settings for different performance tiers
 */
export interface QualitySettings {
  pixelRatio: number;
  shadowMapSize: number;
  particleCount: number;
  enablePostProcessing: boolean;
  enableBloom: boolean;
  enableDithering: boolean;
  antialias: boolean;
  maxLights: number;
}

/**
 * Quality presets for each performance tier
 */
export const QUALITY_PRESETS: Record<PerformanceTier, QualitySettings> = {
  [PerformanceTier.LOW]: {
    pixelRatio: 1,
    shadowMapSize: 512,
    particleCount: 1000,
    enablePostProcessing: false,
    enableBloom: false,
    enableDithering: true,
    antialias: false,
    maxLights: 2,
  },
  [PerformanceTier.MEDIUM]: {
    pixelRatio: 1.5,
    shadowMapSize: 1024,
    particleCount: 5000,
    enablePostProcessing: true,
    enableBloom: false,
    enableDithering: true,
    antialias: true,
    maxLights: 4,
  },
  [PerformanceTier.HIGH]: {
    pixelRatio: 2,
    shadowMapSize: 2048,
    particleCount: 10000,
    enablePostProcessing: true,
    enableBloom: true,
    enableDithering: true,
    antialias: true,
    maxLights: 6,
  },
  [PerformanceTier.ULTRA]: {
    pixelRatio: 2,
    shadowMapSize: 2048,
    particleCount: 20000,
    enablePostProcessing: true,
    enableBloom: true,
    enableDithering: true,
    antialias: true,
    maxLights: 8,
  },
};

/**
 * Detect device performance tier based on hardware capabilities
 */
export function detectPerformanceTier(): PerformanceTier {
  // Check for mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (isMobile) {
    return PerformanceTier.LOW;
  }

  // Check for device memory (if available)
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (deviceMemory) {
    if (deviceMemory >= 8) return PerformanceTier.ULTRA;
    if (deviceMemory >= 4) return PerformanceTier.HIGH;
    if (deviceMemory >= 2) return PerformanceTier.MEDIUM;
    return PerformanceTier.LOW;
  }

  // Check for hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 1;
  if (cores >= 8) return PerformanceTier.ULTRA;
  if (cores >= 4) return PerformanceTier.HIGH;
  if (cores >= 2) return PerformanceTier.MEDIUM;

  return PerformanceTier.LOW;
}

/**
 * Get quality settings for current device
 */
export function getQualitySettings(): QualitySettings {
  const tier = detectPerformanceTier();
  return QUALITY_PRESETS[tier];
}

/**
 * FPS Monitor for performance tracking
 */
export class FPSMonitor {
  private frames = 0;
  private lastTime = performance.now();
  private fps = 60;
  private callback?: (fps: number) => void;

  constructor(callback?: (fps: number) => void) {
    this.callback = callback;
  }

  update(): number {
    this.frames++;
    const currentTime = performance.now();
    const delta = currentTime - this.lastTime;

    if (delta >= 1000) {
      this.fps = Math.round((this.frames * 1000) / delta);
      this.frames = 0;
      this.lastTime = currentTime;

      if (this.callback) {
        this.callback(this.fps);
      }
    }

    return this.fps;
  }

  getCurrentFPS(): number {
    return this.fps;
  }
}

/**
 * Adaptive quality manager - adjusts quality based on performance
 */
export class AdaptiveQuality {
  private fpsMonitor: FPSMonitor;
  private targetFPS = 60;
  private minFPS = 30;
  private currentTier: PerformanceTier;
  private settings: QualitySettings;
  private adjustmentCooldown = 0;
  private readonly cooldownDuration = 5000; // 5 seconds

  constructor(initialTier?: PerformanceTier) {
    this.currentTier = initialTier || detectPerformanceTier();
    this.settings = QUALITY_PRESETS[this.currentTier];
    this.fpsMonitor = new FPSMonitor();
  }

  update(deltaTime: number): QualitySettings {
    const fps = this.fpsMonitor.update();

    // Cooldown to prevent rapid quality changes
    if (this.adjustmentCooldown > 0) {
      this.adjustmentCooldown -= deltaTime;
      return this.settings;
    }

    // If FPS is too low, decrease quality
    if (fps < this.minFPS && this.canDecreaseQuality()) {
      this.decreaseQuality();
      this.adjustmentCooldown = this.cooldownDuration;
    }

    // If FPS is stable above target, try increasing quality
    if (fps > this.targetFPS + 10 && this.canIncreaseQuality()) {
      this.increaseQuality();
      this.adjustmentCooldown = this.cooldownDuration;
    }

    return this.settings;
  }

  private canDecreaseQuality(): boolean {
    const tiers = Object.values(PerformanceTier);
    const currentIndex = tiers.indexOf(this.currentTier);
    return currentIndex > 0;
  }

  private canIncreaseQuality(): boolean {
    const tiers = Object.values(PerformanceTier);
    const currentIndex = tiers.indexOf(this.currentTier);
    return currentIndex < tiers.length - 1;
  }

  private decreaseQuality(): void {
    const tiers = Object.values(PerformanceTier);
    const currentIndex = tiers.indexOf(this.currentTier);
    if (currentIndex > 0) {
      this.currentTier = tiers[currentIndex - 1];
      this.settings = QUALITY_PRESETS[this.currentTier];
      console.log(`[AdaptiveQuality] Decreased to ${this.currentTier}`);
    }
  }

  private increaseQuality(): void {
    const tiers = Object.values(PerformanceTier);
    const currentIndex = tiers.indexOf(this.currentTier);
    if (currentIndex < tiers.length - 1) {
      this.currentTier = tiers[currentIndex + 1];
      this.settings = QUALITY_PRESETS[this.currentTier];
      console.log(`[AdaptiveQuality] Increased to ${this.currentTier}`);
    }
  }

  getCurrentTier(): PerformanceTier {
    return this.currentTier;
  }

  getSettings(): QualitySettings {
    return this.settings;
  }

  getCurrentFPS(): number {
    return this.fpsMonitor.getCurrentFPS();
  }
}

/**
 * Check if WebGL 2 is supported
 */
export function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGL2RenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('experimental-webgl2'))
    );
  } catch (e) {
    return false;
  }
}

/**
 * Check if WebGL is supported at all
 */
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

/**
 * Get WebGL renderer info
 */
export function getWebGLInfo(renderer: THREE.WebGLRenderer): {
  vendor: string;
  renderer: string;
  maxTextureSize: number;
  maxCubeTextureSize: number;
  maxVertexUniforms: number;
  maxFragmentUniforms: number;
} {
  const gl = renderer.getContext();

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const vendor = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
    : 'Unknown';
  const rendererName = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : 'Unknown';

  return {
    vendor,
    renderer: rendererName,
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxCubeTextureSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
    maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
  };
}

/**
 * Optimize geometry for better performance
 */
export function optimizeGeometry(geometry: THREE.BufferGeometry): void {
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  // Remove unnecessary attributes
  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }
}

/**
 * Dispose of Three.js resources to prevent memory leaks
 */
export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => disposeMaterial(material));
        } else {
          disposeMaterial(child.material);
        }
      }
    }
  });
}

/**
 * Dispose of material and its textures
 */
function disposeMaterial(material: THREE.Material): void {
  const mat = material as THREE.MeshStandardMaterial & {
    map?: THREE.Texture;
    lightMap?: THREE.Texture;
    bumpMap?: THREE.Texture;
    normalMap?: THREE.Texture;
    specularMap?: THREE.Texture;
    envMap?: THREE.Texture;
  };

  mat.map?.dispose();
  mat.lightMap?.dispose();
  mat.bumpMap?.dispose();
  mat.normalMap?.dispose();
  mat.specularMap?.dispose();
  mat.envMap?.dispose();

  material.dispose();
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
