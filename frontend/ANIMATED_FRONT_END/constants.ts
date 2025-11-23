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
  { 
    id: '1', 
    name: 'Contract Analyst', 
    role: 'Analysis', 
    description: 'Extracts meta-data instantly', 
    color: COLORS.highlight,
    details: [
      'Natural Language Understanding (NLU) v4.2',
      'Entity Extraction Confidence > 99.8%',
      'Multi-jurisdictional Clause Mapping'
    ],
    stats: [
      { label: 'SPEED', value: '40ms' },
      { label: 'ACCURACY', value: '99%' }
    ]
  },
  { 
    id: '2', 
    name: 'Vendor Intel', 
    role: 'Intelligence', 
    description: 'Predicts vendor risk', 
    color: COLORS.primary,
    details: [
      'Real-time Sanctions Screening',
      'Financial Health Prediction Models',
      'Supply Chain Node Mapping'
    ],
    stats: [
      { label: 'SOURCES', value: '12K+' },
      { label: 'UPDATES', value: 'Real-time' }
    ]
  },
  { 
    id: '3', 
    name: 'Legal Ops', 
    role: 'Operations', 
    description: 'Automates workflow routing', 
    color: COLORS.bloom,
    details: [
      'Dynamic Approval Routing DAGs',
      'Bottleneck Identification Algorithms',
      'Resource Allocation Heuristics'
    ],
    stats: [
      { label: 'EFFICIENCY', value: '+300%' },
      { label: 'AUTO-Approve', value: '65%' }
    ]
  },
  { 
    id: '4', 
    name: 'Compliance', 
    role: 'Guardian', 
    description: 'Enforces regulatory frameworks', 
    color: COLORS.white,
    details: [
      'GDPR/CCPA/HIPAA Auto-flagging',
      'Policy Drift Detection',
      'Audit Trail Immutability (Ledger)'
    ],
    stats: [
      { label: 'RISK', value: '0.01%' },
      { label: 'COVERAGE', value: 'Global' }
    ]
  },
];

export const METRICS: Metric[] = [
  { label: 'CONTRACTS PROCESSED', value: '2.5M+' },
  { label: 'TIME SAVED', value: '87%' },
  { label: 'RISK REDUCTION', value: '94%' },
];
