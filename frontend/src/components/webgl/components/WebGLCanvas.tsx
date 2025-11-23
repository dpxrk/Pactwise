/**
 * WebGL Canvas Wrapper Component
 *
 * Base component for all WebGL scenes
 * Handles renderer setup, post-processing, and responsive sizing
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  Effect,
} from 'postprocessing';
import { DitherEffect } from '../shaders/DitherEffect';
import { preloadTextures } from '../utils/texture-loader';
import {
  getQualitySettings,
  isWebGLSupported,
  FPSMonitor,
  prefersReducedMotion,
} from '../utils/performance';

/**
 * WebGL Canvas Props
 */
export interface WebGLCanvasProps {
  /**
   * Scene builder function - receives scene, camera, and utilities
   */
  buildScene: (params: SceneBuilderParams) => SceneLifecycle | SceneCleanup | void;

  /**
   * Enable post-processing effects
   */
  enablePostProcessing?: boolean;

  /**
   * Enable dithering effect
   */
  enableDithering?: boolean;

  /**
   * Enable bloom effect
   */
  enableBloom?: boolean;

  /**
   * Camera configuration
   */
  camera?: Partial<CameraConfig>;

  /**
   * Background color
   */
  backgroundColor?: THREE.ColorRepresentation;

  /**
   * Mouse tracking for parallax
   */
  enableMouseTracking?: boolean;

  /**
   * CSS class name
   */
  className?: string;

  /**
   * Loading component
   */
  loadingComponent?: React.ReactNode;

  /**
   * Fallback component for unsupported browsers
   */
  fallbackComponent?: React.ReactNode;
}

/**
 * Camera configuration
 */
export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  position: [number, number, number];
}

/**
 * Scene builder parameters
 */
export interface SceneBuilderParams {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer | null;
  mouse: { x: number; y: number };
  clock: THREE.Clock;
}

/**
 * Scene cleanup function
 */
export type SceneCleanup = () => void;

/**
 * Scene lifecycle return type
 */
export interface SceneLifecycle {
  update?: (deltaTime: number, elapsedTime: number) => void;
  cleanup?: () => void;
}

/**
 * Default camera configuration
 */
const defaultCameraConfig: CameraConfig = {
  fov: 75,
  near: 0.1,
  far: 1000,
  position: [0, 0, 10],
};

/**
 * WebGL Canvas Component
 */
export const WebGLCanvas: React.FC<WebGLCanvasProps> = ({
  buildScene,
  enablePostProcessing = true,
  enableDithering = true,
  enableBloom = true,
  camera: cameraConfig = {},
  backgroundColor = 0x1a0d18, // Purple 950
  enableMouseTracking = true,
  className = '',
  loadingComponent,
  fallbackComponent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mouse position for parallax
  const mouseRef = useRef({ x: 0, y: 0 });

  /**
   * Initialize WebGL scene
   */
  const initScene = useCallback(async (): Promise<(() => void) | undefined> => {
    if (!canvasRef.current || !containerRef.current) return;

    // Check WebGL support
    if (!isWebGLSupported()) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    try {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const { width, height } = container.getBoundingClientRect();

      // Get quality settings
      const quality = getQualitySettings();

      // Create renderer
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: quality.antialias,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
      renderer.setClearColor(backgroundColor, 1);

      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(backgroundColor);

      // Create camera
      const mergedCameraConfig = { ...defaultCameraConfig, ...cameraConfig };
      const camera = new THREE.PerspectiveCamera(
        mergedCameraConfig.fov,
        width / height,
        mergedCameraConfig.near,
        mergedCameraConfig.far
      );
      camera.position.set(...mergedCameraConfig.position);

      // Create clock
      const clock = new THREE.Clock();

      // Post-processing setup
      let composer: EffectComposer | null = null;

      if (enablePostProcessing && quality.enablePostProcessing) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));

        const effects: Effect[] = [];

        // Load textures for dithering
        if (enableDithering && quality.enableDithering) {
          const textures = await preloadTextures();
          const ditherEffect = new DitherEffect({
            gradientLUT: textures.gradientLUT,
            threshold: 0.0,
            intensity: 0.8,
          });
          effects.push(ditherEffect);
        }

        // Add bloom effect
        if (enableBloom && quality.enableBloom) {
          const bloomEffect = new BloomEffect({
            intensity: 0.5,
            luminanceThreshold: 0.8,
            luminanceSmoothing: 0.3,
          });
          effects.push(bloomEffect);
        }

        if (effects.length > 0) {
          composer.addPass(new EffectPass(camera, ...effects));
        }
      }

      // FPS monitor
      const fpsMonitor = new FPSMonitor((fps) => {
        if (fps < 30) {
          console.warn(`[WebGLCanvas] Low FPS detected: ${fps}`);
        }
      });

      // Build scene
      const sceneResult = buildScene({
        scene,
        camera,
        renderer,
        composer,
        mouse: mouseRef.current,
        clock,
      });

      // Extract update and cleanup functions
      let updateFn: ((deltaTime: number, elapsedTime: number) => void) | undefined;
      let cleanupFn: (() => void) | undefined;

      if (typeof sceneResult === 'function') {
        // Legacy cleanup function
        cleanupFn = sceneResult;
      } else if (sceneResult && typeof sceneResult === 'object') {
        // New lifecycle object
        updateFn = sceneResult.update;
        cleanupFn = sceneResult.cleanup;
      }

      // Animation loop
      let animationId: number;
      const animate = () => {
        animationId = requestAnimationFrame(animate);

        const deltaTime = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // Call scene update if provided
        if (updateFn) {
          updateFn(deltaTime, elapsedTime);
        }

        fpsMonitor.update();

        if (composer) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }
      };

      // Check for reduced motion preference
      if (!prefersReducedMotion()) {
        animate();
      } else {
        // Render once for static view
        if (composer) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }
      }

      // Handle resize
      const handleResize = () => {
        if (!containerRef.current) return;

        const { width, height } = containerRef.current.getBoundingClientRect();

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
        if (composer) {
          composer.setSize(width, height);
        }
      };

      window.addEventListener('resize', handleResize);

      // Handle mouse movement
      const handleMouseMove = (event: MouseEvent) => {
        if (!enableMouseTracking) return;

        const { clientX, clientY } = event;
        const { width, height } = window.innerWidth
          ? { width: window.innerWidth, height: window.innerHeight }
          : { width: 1920, height: 1080 };

        mouseRef.current.x = (clientX / width) * 2 - 1;
        mouseRef.current.y = -(clientY / height) * 2 + 1;
      };

      window.addEventListener('mousemove', handleMouseMove);

      setIsLoading(false);

      // Cleanup function
      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);

        if (cleanupFn) {
          cleanupFn();
        }

        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat.dispose());
            } else {
              object.material.dispose();
            }
          }
        });

        renderer.dispose();
        if (composer) {
          composer.dispose();
        }
      };
    } catch (err) {
      console.error('[WebGLCanvas] Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
      return undefined;
    }
  }, [
    buildScene,
    enablePostProcessing,
    enableDithering,
    enableBloom,
    cameraConfig,
    backgroundColor,
    enableMouseTracking,
  ]);

  useEffect(() => {
    const cleanup = initScene();

    return () => {
      if (cleanup) {
        cleanup.then((fn) => fn && fn());
      }
    };
  }, [initScene]);

  // Render fallback for unsupported browsers
  if (!isSupported) {
    return (
      <div className={className}>
        {fallbackComponent || (
          <div className="flex items-center justify-center h-full text-purple-300">
            <p>WebGL is not supported in your browser.</p>
          </div>
        )}
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full text-red-400">
          <p>Error initializing WebGL: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
      {isLoading && loadingComponent && (
        <div className="absolute inset-0 flex items-center justify-center">
          {loadingComponent}
        </div>
      )}
    </div>
  );
};

export default WebGLCanvas;
