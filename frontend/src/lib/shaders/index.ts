/**
 * Custom GLSL Shader Materials for Pactwise Landing Page
 *
 * This module exports all custom shader materials used for the 3D experience:
 * - AbstractAgentCore: Organic, breathing AI agent visualizations
 * - EnergyFlowStream: GPU particle flows for data streams
 * - ConnectionBeam: Pulsing energy connections between elements
 * - HolographicGauge/Rings/Bars: Sci-fi holographic displays
 * - ProceduralBackground: Animated gradient backgrounds
 * - InfiniteGrid: Procedural grid with fog fade
 * - AmbientParticleField: Floating atmospheric particles
 */

// Noise utilities
export { noiseGLSL, commonGLSL, pactwiseColorsGLSL } from './noise';

// Agent materials
export {
  AbstractAgentCore,
  AgentGlowField,
} from './materials/AbstractAgentMaterial';

// Flow and connection materials
export {
  EnergyFlowStream,
  DataStreamPortalEffect,
  ConnectionBeam,
} from './materials/EnergyFlowMaterial';

// Holographic display materials
export {
  HolographicGauge,
  HolographicRings,
  HolographicBars,
  FloatingHologramFrame,
} from './materials/HolographicMaterial';

// Environment materials
export {
  ProceduralBackground,
  InfiniteGrid,
  AmbientParticleField,
  EnvironmentSetup,
} from './materials/EnvironmentMaterial';
