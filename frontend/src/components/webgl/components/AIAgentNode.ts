/**
 * AI Agent Node Component
 *
 * Represents a single AI agent as a glowing sphere in 3D space
 * Used in the Hero Scene AI Agent Network visualization
 */

import * as THREE from 'three';

import { agentMaterialPresets, updateAgentGlowMaterial } from '../shaders/agentGlow';

/**
 * Agent types matching brand identity
 */
export type AgentType =
  | 'contractAnalyst'
  | 'vendorIntelligence'
  | 'legalOperations'
  | 'complianceGuardian';

/**
 * AI Agent Node configuration
 */
export interface AIAgentNodeConfig {
  type: AgentType;
  position: THREE.Vector3;
  radius?: number;
  segments?: number;
}

/**
 * AI Agent Node Class
 */
export class AIAgentNode {
  public mesh: THREE.Mesh;
  public material: THREE.ShaderMaterial;
  public type: AgentType;
  private radius: number;

  constructor(config: AIAgentNodeConfig) {
    const { type, position, radius = 0.8, segments: _segments = 32 } = config;

    this.type = type;
    this.radius = radius;

    // Create geometry - icosahedron for more interesting shape
    const geometry = new THREE.IcosahedronGeometry(radius, 3);

    // Get material preset for agent type
    const materialPreset = agentMaterialPresets[type];
    this.material = materialPreset();

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(position);

    // Add user data for identification
    this.mesh.userData = {
      type: 'aiAgent',
      agentType: type,
      nodeInstance: this,
    };
  }

  /**
   * Update agent animation
   */
  update(deltaTime: number): void {
    // Update glow material
    updateAgentGlowMaterial(this.material, deltaTime);

    // Subtle rotation animation
    this.mesh.rotation.y += deltaTime * 0.2;
    this.mesh.rotation.x += deltaTime * 0.1;
  }

  /**
   * Get position
   */
  getPosition(): THREE.Vector3 {
    return this.mesh.position;
  }

  /**
   * Set position
   */
  setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
  }

  /**
   * Get radius
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * Add to scene
   */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }

  /**
   * Remove from scene
   */
  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }

  /**
   * Animate scale on hover (for future interactivity)
   */
  animateScale(targetScale: number, duration: number = 0.3): void {
    const startScale = this.mesh.scale.x;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentScale = startScale + (targetScale - startScale) * eased;
      this.mesh.scale.set(currentScale, currentScale, currentScale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }
}

/**
 * Create agent network layout
 * Arranges agents in a visually pleasing formation
 */
export function createAgentNetworkLayout(): Record<AgentType, THREE.Vector3> {
  // Tetrahedron-like arrangement for 4 agents
  const spread = 4;

  return {
    contractAnalyst: new THREE.Vector3(-spread, spread * 0.8, 0),
    vendorIntelligence: new THREE.Vector3(spread, spread * 0.8, 0),
    legalOperations: new THREE.Vector3(-spread * 0.5, -spread * 0.8, spread * 0.5),
    complianceGuardian: new THREE.Vector3(spread * 0.5, -spread * 0.8, -spread * 0.5),
  };
}

/**
 * Get agent display name
 */
export function getAgentDisplayName(type: AgentType): string {
  const names: Record<AgentType, string> = {
    contractAnalyst: 'Contract Analyst AI',
    vendorIntelligence: 'Vendor Intelligence AI',
    legalOperations: 'Legal Operations AI',
    complianceGuardian: 'Compliance Guardian AI',
  };

  return names[type];
}

/**
 * Get agent description
 */
export function getAgentDescription(type: AgentType): string {
  const descriptions: Record<AgentType, string> = {
    contractAnalyst: 'Analyzes contracts with precision and extracts key terms',
    vendorIntelligence: 'Monitors vendor performance and predicts issues',
    legalOperations: 'Orchestrates workflows and optimizes processes',
    complianceGuardian: 'Ensures nothing falls through regulatory cracks',
  };

  return descriptions[type];
}
