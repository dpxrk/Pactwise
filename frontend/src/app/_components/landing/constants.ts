import {
  Brain,
  Building,
  FileText,
  Shield,
  Briefcase,
  Network,
  Zap,
  Database,
  GitBranch,
  Lock,
  type LucideIcon,
} from 'lucide-react';

export const DISCOUNT_CODES = {
  // Removed promotional discounts
} as const;

export const BASE_PRICE = 50;

export const PRICING_FEATURES = [
  'Unlimited contracts processing',
  'All 4 AI agents included',
  'Advanced analytics & reporting',
  'Custom integrations',
  'Priority 24/7 support',
  '99.99% uptime SLA',
  'API access',
  'Team collaboration tools',
  'Automated workflows',
  'Data export capabilities',
] as const;

export const AI_AGENTS = [
  {
    id: '1',
    name: 'Contract Analyst AI',
    icon: FileText,
    gradient: 'from-purple-900 to-purple-700',
    color: '#291528',
    status: 'Beta',
    geometry: 'box',
    description:
      'Autonomous contract analysis with advanced NLP that understands context, extracts critical terms, and identifies risks in milliseconds.',
    capabilities: [
      'Real-time risk scoring & mitigation',
      'Multi-language contract processing',
      'Automated clause optimization',
      'Regulatory compliance validation',
    ],
    details: [
      'Natural Language Understanding (NLU) v4.2',
      'Real-time risk scoring with ML models',
      'Multi-language support (15+ languages)',
      'Clause optimization recommendations',
      '150ms average processing time',
      'Integrates with agent_tasks queue',
      'PostgreSQL-backed storage',
      'Supports batch processing (10,000+ contracts/hour)',
    ],
    stats: { label: 'SPEED', value: '40ms' },
  },
  {
    id: '2',
    name: 'Vendor Intelligence AI',
    icon: Building,
    gradient: 'from-purple-500 to-pink-400',
    color: '#9e829c',
    status: 'Beta',
    geometry: 'icosahedron',
    description:
      'Continuously monitors vendor performance, predicts risks, and autonomously manages relationships at scale.',
    capabilities: [
      'Predictive vendor risk analysis',
      'Automated performance scoring',
      'Smart negotiation recommendations',
      'Supply chain optimization',
    ],
    details: [
      'Predictive vendor risk analysis',
      'Automated performance scoring',
      'Supply chain optimization algorithms',
      'Continuous monitoring with memory system',
      'Short-term (24h) and long-term memory',
      'Q-learning for pattern recognition',
      'Vendor relationship insights',
      '94% accuracy in risk prediction',
    ],
    stats: { label: 'ACCURACY', value: '94%' },
  },
  {
    id: '3',
    name: 'Legal Operations AI',
    icon: Briefcase,
    gradient: 'from-purple-800 to-purple-600',
    color: '#533e52',
    status: 'Beta',
    geometry: 'torusKnot',
    description:
      'Creates custom business logic, generates contracts from templates, and handles complex legal workflows automatically.',
    capabilities: [
      'Dynamic contract generation',
      'Workflow automation builder',
      'Legal research integration',
      'Precedent analysis & matching',
    ],
    details: [
      'Dynamic contract generation from templates',
      'Workflow automation builder (visual interface)',
      'Precedent analysis and matching',
      'Legal research integration',
      'PostgreSQL function-based business logic',
      'Multi-tenant isolation (enterprise_id filtering)',
      'Complex workflow orchestration',
      '99.9% system uptime',
    ],
    stats: { label: 'UPTIME', value: '99.9%' },
  },
  {
    id: '4',
    name: 'Compliance Guardian AI',
    icon: Shield,
    gradient: 'from-purple-700 to-purple-500',
    color: '#644862',
    status: 'Beta',
    geometry: 'octahedron',
    description:
      '24/7 compliance monitoring across all contracts with automatic updates for regulatory changes and policy enforcement.',
    capabilities: [
      'Real-time regulatory tracking',
      'Automated audit trail generation',
      'Policy violation detection',
      'Compliance report automation',
    ],
    details: [
      'Real-time regulatory tracking (50+ jurisdictions)',
      'Automated audit trail generation',
      'Policy violation detection with alerts',
      'Compliance report automation',
      '24/7 autonomous operation',
      'Database triggers for automated workflows',
      'SOC2 Type II certified infrastructure',
      'Complete audit logging',
    ],
    stats: { label: 'COVERAGE', value: '24/7' },
  },
] as const;

export const PLATFORM_FEATURES: {
  icon: LucideIcon;
  title: string;
  description: string;
  stats: { value: string; label: string };
}[] = [
  {
    icon: Brain,
    title: 'Neural Processing Engine',
    description:
      'Advanced transformer models trained on millions of contracts for unparalleled accuracy and speed.',
    stats: { value: '150ms', label: 'avg. processing time' },
  },
  {
    icon: Network,
    title: 'Multi-Agent Orchestration',
    description:
      'Multiple AI agents collaborate in real-time to solve complex contract challenges.',
    stats: { value: '24/7', label: 'autonomous operation' },
  },
  {
    icon: Zap,
    title: 'Lightning Performance',
    description:
      'Process thousands of contracts simultaneously with sub-second response times.',
    stats: { value: '10,000+', label: 'contracts/hour' },
  },
  {
    icon: Database,
    title: 'Knowledge Graph',
    description:
      'Continuously learning system that improves with every contract processed.',
    stats: { value: 'AI', label: 'powered' },
  },
  {
    icon: GitBranch,
    title: 'Version Intelligence',
    description:
      'Track changes, compare versions, and understand contract evolution over time.',
    stats: { value: '∞', label: 'version tracking' },
  },
  {
    icon: Lock,
    title: 'Zero-Trust Security',
    description:
      'Military-grade encryption with complete data isolation and audit logging.',
    stats: { value: 'SOC2', label: 'certified' },
  },
];

export const ANIMATED_METRICS = [
  // Removed misleading stats - keeping it honest during beta
] as const;

export const DEMO_SCENARIOS = [
  {
    title: 'Comprehensive Contract Intelligence',
    steps: [
      'Upload contract & vendor data',
      'AI analyzes terms, clauses & compliance',
      'Evaluate vendor performance & risks',
      'Generate negotiation strategies',
      'Monitor regulatory compliance',
      'Deliver actionable insights & reports',
    ],
  },
] as const;

export const NAV_LINKS = [
  { href: '#agents', label: 'AI Solutions' },
  { href: '#features', label: 'Technology' },
  { href: '#metrics', label: 'Performance' },
] as const;

export const FOOTER_LINKS = [
  { href: '/docs', label: 'Documentation' },
  { href: '/api', label: 'API' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const;