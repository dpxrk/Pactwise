/**
 * Agent Glow Shader
 *
 * Fresnel-based rim lighting shader for AI agent nodes
 * Creates distinctive purple/pink glow effects around agent spheres
 */

import * as THREE from 'three';

/**
 * Agent Glow Vertex Shader
 */
export const agentGlowVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * Agent Glow Fragment Shader
 */
export const agentGlowFragmentShader = /* glsl */ `
uniform vec3 uBaseColor;
uniform vec3 uGlowColor;
uniform float uFresnelPower;
uniform float uGlowIntensity;
uniform float uTime;
uniform float uPulseSpeed;
uniform float uPulseIntensity;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // Fresnel effect for rim lighting
  float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), uFresnelPower);

  // Pulsing animation
  float pulse = sin(uTime * uPulseSpeed) * 0.5 + 0.5;
  pulse = mix(1.0, pulse, uPulseIntensity);

  // Combine base color with glow
  vec3 glowEffect = uGlowColor * fresnel * uGlowIntensity * pulse;
  vec3 finalColor = uBaseColor + glowEffect;

  // Calculate alpha based on fresnel
  float alpha = mix(0.95, 1.0, fresnel);

  gl_FragColor = vec4(finalColor, alpha);
}
`;

/**
 * Agent Glow Material Options
 */
export interface AgentGlowMaterialOptions {
  baseColor?: THREE.Color;
  glowColor?: THREE.Color;
  fresnelPower?: number;
  glowIntensity?: number;
  pulseSpeed?: number;
  pulseIntensity?: number;
  transparent?: boolean;
}

/**
 * Create agent glow material
 */
export function createAgentGlowMaterial(
  options: AgentGlowMaterialOptions = {}
): THREE.ShaderMaterial {
  const {
    baseColor = new THREE.Color(0x291528), // Purple 900
    glowColor = new THREE.Color(0x9e829c),  // Purple 500
    fresnelPower = 3.0,
    glowIntensity = 1.5,
    pulseSpeed = 1.0,
    pulseIntensity = 0.3,
    transparent = true,
  } = options;

  return new THREE.ShaderMaterial({
    vertexShader: agentGlowVertexShader,
    fragmentShader: agentGlowFragmentShader,
    uniforms: {
      uBaseColor: { value: baseColor },
      uGlowColor: { value: glowColor },
      uFresnelPower: { value: fresnelPower },
      uGlowIntensity: { value: glowIntensity },
      uTime: { value: 0 },
      uPulseSpeed: { value: pulseSpeed },
      uPulseIntensity: { value: pulseIntensity },
    },
    transparent,
    side: THREE.FrontSide,
    depthWrite: true,
  });
}

/**
 * Agent-specific material presets
 */
export const agentMaterialPresets = {
  /**
   * Contract Analyst AI - Dark Purple
   */
  contractAnalyst: () =>
    createAgentGlowMaterial({
      baseColor: new THREE.Color(0x291528),  // Purple 900
      glowColor: new THREE.Color(0x644862),  // Purple 700
      fresnelPower: 3.0,
      glowIntensity: 1.8,
      pulseSpeed: 0.8,
      pulseIntensity: 0.25,
    }),

  /**
   * Vendor Intelligence AI - Mountbatten Pink
   */
  vendorIntelligence: () =>
    createAgentGlowMaterial({
      baseColor: new THREE.Color(0x9e829c),  // Purple 500
      glowColor: new THREE.Color(0xdab5d5),  // Purple 300
      fresnelPower: 2.5,
      glowIntensity: 2.0,
      pulseSpeed: 1.2,
      pulseIntensity: 0.35,
    }),

  /**
   * Legal Operations AI - Dark Purple Variant
   */
  legalOperations: () =>
    createAgentGlowMaterial({
      baseColor: new THREE.Color(0x533e52),  // Purple 800
      glowColor: new THREE.Color(0x9e829c),  // Purple 500
      fresnelPower: 3.2,
      glowIntensity: 1.6,
      pulseSpeed: 0.9,
      pulseIntensity: 0.3,
    }),

  /**
   * Compliance Guardian AI - Medium Purple
   */
  complianceGuardian: () =>
    createAgentGlowMaterial({
      baseColor: new THREE.Color(0x7d5c7b),  // Purple 600
      glowColor: new THREE.Color(0xc388bb),  // Purple 400
      fresnelPower: 2.8,
      glowIntensity: 1.7,
      pulseSpeed: 1.0,
      pulseIntensity: 0.28,
    }),
};

/**
 * Update agent glow material uniforms
 */
export function updateAgentGlowMaterial(
  material: THREE.ShaderMaterial,
  deltaTime: number
): void {
  if (material.uniforms.uTime) {
    material.uniforms.uTime.value += deltaTime;
  }
}
