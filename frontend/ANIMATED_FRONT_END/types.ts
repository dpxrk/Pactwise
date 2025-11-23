export type Section = 'hero' | 'features' | 'agents' | 'pricing' | 'cta';

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  color: string;
}

export interface Metric {
  label: string;
  value: string;
}

export interface Uniforms {
  [uniform: string]: { value: any };
}
