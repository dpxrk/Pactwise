import { Agent, Metric } from './types';
import * as THREE from 'three';

export const COLORS = {
  deep: '#291528',
  primary: '#9e829c',
  highlight: '#dab5d5',
  white: '#f0eff4',
  bloom: '#c388bb'
};

export const THREE_COLORS = {
  deep: new THREE.Color(COLORS.deep),
  primary: new THREE.Color(COLORS.primary),
  highlight: new THREE.Color(COLORS.highlight),
  white: new THREE.Color(COLORS.white),
  bloom: new THREE.Color(COLORS.bloom),
};

export const AGENTS: Agent[] = [
  { id: '1', name: 'Contract Analyst', role: 'Analysis', description: 'Extracts meta-data instantly', color: COLORS.highlight },
  { id: '2', name: 'Vendor Intel', role: 'Intelligence', description: 'Predicts vendor risk', color: COLORS.primary },
  { id: '3', name: 'Legal Ops', role: 'Operations', description: 'Automates workflow routing', color: COLORS.bloom },
  { id: '4', name: 'Compliance', role: 'Guardian', description: 'Enforces regulatory frameworks', color: COLORS.white },
];

export const METRICS: Metric[] = [
  { label: 'CONTRACTS PROCESSED', value: '2.5M+' },
  { label: 'TIME SAVED', value: '87%' },
  { label: 'RISK REDUCTION', value: '94%' },
];