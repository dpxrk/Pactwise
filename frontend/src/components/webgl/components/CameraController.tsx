"use client";

import { useFrame, useThree } from '@react-three/fiber';
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';

// Easing functions
const easings = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => t * t * t,
};

export interface CameraKeyframe {
  scrollStart: number;
  scrollEnd: number;
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov?: number;
  easing: keyof typeof easings;
}

interface CameraControllerProps {
  scrollProgress: number;
  keyframes: CameraKeyframe[];
  enabled?: boolean;
  // Override for agent focus - when set, camera focuses on this position
  focusTarget?: THREE.Vector3 | null;
  focusDistance?: number;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  scrollProgress,
  keyframes,
  enabled = true,
  focusTarget = null,
  focusDistance = 5,
}) => {
  const { camera } = useThree();
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  // Memoize sorted keyframes
  const sortedKeyframes = useMemo(() => {
    return [...keyframes].sort((a, b) => a.scrollStart - b.scrollStart);
  }, [keyframes]);

  useFrame(() => {
    if (!enabled) return;

    // If there's a focus target (agent clicked), smoothly move to it
    if (focusTarget) {
      const targetCameraPosition = new THREE.Vector3(
        focusTarget.x,
        focusTarget.y,
        focusTarget.z + focusDistance
      );

      camera.position.lerp(targetCameraPosition, 0.05);
      currentLookAt.current.lerp(focusTarget, 0.05);
      camera.lookAt(currentLookAt.current);
      return;
    }

    // Find the current keyframe based on scroll progress
    let currentKeyframe: CameraKeyframe | null = null;
    let nextKeyframe: CameraKeyframe | null = null;

    for (let i = 0; i < sortedKeyframes.length; i++) {
      const kf = sortedKeyframes[i];
      if (scrollProgress >= kf.scrollStart && scrollProgress <= kf.scrollEnd) {
        currentKeyframe = kf;
        nextKeyframe = sortedKeyframes[i + 1] || null;
        break;
      }
    }

    // If between keyframes, interpolate to the next one
    if (!currentKeyframe && sortedKeyframes.length > 0) {
      // Find the keyframe we're transitioning FROM (the one we just passed)
      for (let i = sortedKeyframes.length - 1; i >= 0; i--) {
        if (scrollProgress > sortedKeyframes[i].scrollEnd) {
          currentKeyframe = sortedKeyframes[i];
          nextKeyframe = sortedKeyframes[i + 1] || null;
          break;
        }
      }

      // If still not found, we're before the first keyframe
      if (!currentKeyframe) {
        currentKeyframe = sortedKeyframes[0];
      }
    }

    if (!currentKeyframe) return;

    // Calculate interpolation
    let targetPosition: THREE.Vector3;
    let targetLookAt: THREE.Vector3;
    let targetFov: number;

    if (nextKeyframe && scrollProgress > currentKeyframe.scrollEnd) {
      // Interpolating between keyframes
      const transitionStart = currentKeyframe.scrollEnd;
      const transitionEnd = nextKeyframe.scrollStart;
      const transitionProgress = Math.min(1, Math.max(0,
        (scrollProgress - transitionStart) / (transitionEnd - transitionStart)
      ));

      const easedProgress = easings.easeInOut(transitionProgress);

      targetPosition = new THREE.Vector3().lerpVectors(
        currentKeyframe.position,
        nextKeyframe.position,
        easedProgress
      );
      targetLookAt = new THREE.Vector3().lerpVectors(
        currentKeyframe.lookAt,
        nextKeyframe.lookAt,
        easedProgress
      );
      targetFov = THREE.MathUtils.lerp(
        currentKeyframe.fov || 60,
        nextKeyframe.fov || 60,
        easedProgress
      );
    } else if (currentKeyframe) {
      // Within a keyframe - calculate progress within this keyframe
      const keyframeProgress = Math.min(1, Math.max(0,
        (scrollProgress - currentKeyframe.scrollStart) /
        (currentKeyframe.scrollEnd - currentKeyframe.scrollStart)
      ));

      const easing = easings[currentKeyframe.easing];
      const easedProgress = easing(keyframeProgress);

      // If there's a next keyframe, interpolate towards it within this keyframe
      if (nextKeyframe) {
        targetPosition = new THREE.Vector3().lerpVectors(
          currentKeyframe.position,
          nextKeyframe.position,
          easedProgress * 0.3 // Subtle drift towards next position
        );
        targetLookAt = new THREE.Vector3().lerpVectors(
          currentKeyframe.lookAt,
          nextKeyframe.lookAt,
          easedProgress * 0.3
        );
      } else {
        targetPosition = currentKeyframe.position.clone();
        targetLookAt = currentKeyframe.lookAt.clone();
      }
      targetFov = currentKeyframe.fov || 60;
    } else {
      return;
    }

    // Smooth lerp to target
    camera.position.lerp(targetPosition, 0.03);
    currentLookAt.current.lerp(targetLookAt, 0.03);
    camera.lookAt(currentLookAt.current);

    // Update FOV if perspective camera
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.03);
      camera.updateProjectionMatrix();
    }
  });

  return null;
};

// Digital Ecosystem Camera Journey - Walking Through Pactwise HQ
export const LANDING_CAMERA_KEYFRAMES: CameraKeyframe[] = [
  // 1. Entry Portal (0-15%) - Looking into the ecosystem from outside
  // User sees data streams flowing into the system
  {
    scrollStart: 0,
    scrollEnd: 0.15,
    position: new THREE.Vector3(0, 2, 18),
    lookAt: new THREE.Vector3(0, 0, 0),
    fov: 55,
    easing: 'easeOut',
  },
  // 2. Data Stream View (15-25%) - Move closer, see the data portal
  // Contracts streaming in as particles
  {
    scrollStart: 0.15,
    scrollEnd: 0.25,
    position: new THREE.Vector3(3, 2.5, 12),
    lookAt: new THREE.Vector3(0, 0, -2),
    fov: 60,
    easing: 'easeInOut',
  },
  // 3. AI Agent Chamber (25-40%) - Pan left to see agents at work
  // 4 AI agents processing documents
  {
    scrollStart: 0.25,
    scrollEnd: 0.40,
    position: new THREE.Vector3(-5, 3, 8),
    lookAt: new THREE.Vector3(-2, 1, -4),
    fov: 65,
    easing: 'easeInOut',
  },
  // 4. Intelligence Core (40-55%) - Rise up to see data visualizations
  // Risk gauges, compliance rings, key terms cloud
  {
    scrollStart: 0.40,
    scrollEnd: 0.55,
    position: new THREE.Vector3(0, 5, 6),
    lookAt: new THREE.Vector3(0, 2, -6),
    fov: 60,
    easing: 'easeInOut',
  },
  // 5. Data Visualization Focus (55-70%) - Orbit around intelligence
  // See the extracted insights up close
  {
    scrollStart: 0.55,
    scrollEnd: 0.70,
    position: new THREE.Vector3(4, 4, 8),
    lookAt: new THREE.Vector3(0, 1, -3),
    fov: 55,
    easing: 'linear',
  },
  // 6. Ecosystem Overview (70-85%) - Pull back for full network view
  // Connected nodes showing contracts, vendors, insights
  {
    scrollStart: 0.70,
    scrollEnd: 0.85,
    position: new THREE.Vector3(-3, 7, 14),
    lookAt: new THREE.Vector3(0, 0, -2),
    fov: 65,
    easing: 'easeInOut',
  },
  // 7. Command Center (85-100%) - Final position, commanding view
  // Everything organized, ready for CTA
  {
    scrollStart: 0.85,
    scrollEnd: 1.0,
    position: new THREE.Vector3(0, 4, 16),
    lookAt: new THREE.Vector3(0, 1, 0),
    fov: 50,
    easing: 'easeOut',
  },
];

export default CameraController;
