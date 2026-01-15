/**
 * Connection Line Component
 *
 * Draws lines between AI agent nodes to show network connections
 * Supports animated flow and purple/pink gradient colors
 */

import * as THREE from 'three';

import { BRAND_COLORS } from '../utils/color-utils';

/**
 * Connection Line configuration
 */
export interface ConnectionLineConfig {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color?: THREE.Color;
  opacity?: number;
  lineWidth?: number;
  animated?: boolean;
}

/**
 * Connection Line Class
 */
export class ConnectionLine {
  public line: THREE.Line;
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial | THREE.ShaderMaterial;
  private animated: boolean;
  private animationTime: number = 0;

  constructor(config: ConnectionLineConfig) {
    const {
      start,
      end,
      color = new THREE.Color(BRAND_COLORS.purple[500]),
      opacity = 0.6,
      lineWidth = 1,
      animated = false,
    } = config;

    this.animated = animated;

    // Create curve for smooth connection
    const curve = new THREE.QuadraticBezierCurve3(
      start,
      new THREE.Vector3(
        (start.x + end.x) / 2,
        (start.y + end.y) / 2 + 1, // Slight arc upward
        (start.z + end.z) / 2
      ),
      end
    );

    // Generate points along curve
    const points = curve.getPoints(50);
    this.geometry = new THREE.BufferGeometry().setFromPoints(points);

    if (animated) {
      // Create animated shader material for flow effect
      this.material = this.createAnimatedMaterial(color, opacity);
    } else {
      // Simple line material
      this.material = new THREE.LineBasicMaterial({
        color,
        opacity,
        transparent: true,
        linewidth: lineWidth,
      });
    }

    this.line = new THREE.Line(this.geometry, this.material);
    this.line.userData = {
      type: 'connectionLine',
      lineInstance: this,
    };
  }

  /**
   * Create animated shader material for flowing lines
   */
  private createAnimatedMaterial(
    color: THREE.Color,
    opacity: number
  ): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: color },
        uOpacity: { value: opacity },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;

        varying vec2 vUv;

        void main() {
          // Create flowing effect
          float flow = fract(vUv.x * 2.0 - uTime * 0.5);
          float pulse = smoothstep(0.0, 0.2, flow) * smoothstep(1.0, 0.8, flow);

          float alpha = uOpacity + pulse * 0.3;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
  }

  /**
   * Update animation
   */
  update(deltaTime: number): void {
    if (this.animated && this.material instanceof THREE.ShaderMaterial) {
      this.animationTime += deltaTime;
      this.material.uniforms.uTime.value = this.animationTime;
    }
  }

  /**
   * Update start position
   */
  updateStart(start: THREE.Vector3): void {
    this.updateGeometry(start, this.getEnd());
  }

  /**
   * Update end position
   */
  updateEnd(end: THREE.Vector3): void {
    this.updateGeometry(this.getStart(), end);
  }

  /**
   * Update both positions
   */
  updatePositions(start: THREE.Vector3, end: THREE.Vector3): void {
    this.updateGeometry(start, end);
  }

  /**
   * Get start position
   */
  private getStart(): THREE.Vector3 {
    const positions = this.geometry.attributes.position;
    return new THREE.Vector3(
      positions.getX(0),
      positions.getY(0),
      positions.getZ(0)
    );
  }

  /**
   * Get end position
   */
  private getEnd(): THREE.Vector3 {
    const positions = this.geometry.attributes.position;
    const lastIndex = positions.count - 1;
    return new THREE.Vector3(
      positions.getX(lastIndex),
      positions.getY(lastIndex),
      positions.getZ(lastIndex)
    );
  }

  /**
   * Update geometry with new positions
   */
  private updateGeometry(start: THREE.Vector3, end: THREE.Vector3): void {
    const curve = new THREE.QuadraticBezierCurve3(
      start,
      new THREE.Vector3(
        (start.x + end.x) / 2,
        (start.y + end.y) / 2 + 1,
        (start.z + end.z) / 2
      ),
      end
    );

    const points = curve.getPoints(50);
    this.geometry.setFromPoints(points);
    this.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Add to scene
   */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.line);
  }

  /**
   * Remove from scene
   */
  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.line);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.line.visible = visible;
  }

  /**
   * Set opacity
   */
  setOpacity(opacity: number): void {
    if (this.material instanceof THREE.LineBasicMaterial) {
      this.material.opacity = opacity;
    } else if (this.material instanceof THREE.ShaderMaterial) {
      this.material.uniforms.uOpacity.value = opacity;
    }
  }
}

/**
 * Create connection lines between all agents in a network
 */
export function createAgentConnections(
  agentPositions: Record<string, THREE.Vector3>,
  animated: boolean = true
): ConnectionLine[] {
  const connections: ConnectionLine[] = [];
  const types = Object.keys(agentPositions);

  // Create connections between all pairs
  for (let i = 0; i < types.length; i++) {
    for (let j = i + 1; j < types.length; j++) {
      const start = agentPositions[types[i]];
      const end = agentPositions[types[j]];

      connections.push(
        new ConnectionLine({
          start,
          end,
          animated,
          opacity: 0.4,
        })
      );
    }
  }

  return connections;
}
