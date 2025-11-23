export type Section = 'hero' | 'features' | 'agents' | 'pricing' | 'cta';

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  details: string[]; // New: Bullet points for expanded view
  stats: { label: string; value: string }[]; // New: Mini metrics
  color: string;
}

export interface Metric {
  label: string;
  value: string;
}

export interface Uniforms {
  [uniform: string]: { value: any };
}
