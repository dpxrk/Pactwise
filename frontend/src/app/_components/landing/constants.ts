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
} from 'lucide-react';

export const DISCOUNT_CODES = {
  EARLY500: {
    discount: 90,
    description: 'First 500 Users - 90% off for 24 months',
  },
  LAUNCH90: {
    discount: 90,
    description: 'Launch Special - 90% off for 24 months',
  },
  FOUNDERS: {
    discount: 90,
    description: 'Founders Program - 90% off for 24 months',
  },
} as const;

export const BASE_PRICE = 500;

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
    name: 'Contract Analyst AI',
    icon: FileText,
    gradient: 'from-blue-500 to-cyan-500',
    color: '#3B82F6',
    status: 'Production',
    performance: 99.7,
    description:
      'Autonomous contract analysis with advanced NLP that understands context, extracts critical terms, and identifies risks in milliseconds.',
    capabilities: [
      'Real-time risk scoring & mitigation',
      'Multi-language contract processing',
      'Automated clause optimization',
      'Regulatory compliance validation',
    ],
  },
  {
    name: 'Vendor Intelligence AI',
    icon: Building,
    gradient: 'from-purple-500 to-pink-500',
    color: '#A855F7',
    status: 'Production',
    performance: 98.9,
    description:
      'Continuously monitors vendor performance, predicts risks, and autonomously manages relationships at scale.',
    capabilities: [
      'Predictive vendor risk analysis',
      'Automated performance scoring',
      'Smart negotiation recommendations',
      'Supply chain optimization',
    ],
  },
  {
    name: 'Legal Operations AI',
    icon: Briefcase,
    gradient: 'from-orange-500 to-red-500',
    color: '#F97316',
    status: 'Beta',
    performance: 97.2,
    description:
      'Creates custom business logic, generates contracts from templates, and handles complex legal workflows automatically.',
    capabilities: [
      'Dynamic contract generation',
      'Workflow automation builder',
      'Legal research integration',
      'Precedent analysis & matching',
    ],
  },
  {
    name: 'Compliance Guardian AI',
    icon: Shield,
    gradient: 'from-green-500 to-emerald-500',
    color: '#10B981',
    status: 'Production',
    performance: 99.9,
    description:
      '24/7 compliance monitoring across all contracts with automatic updates for regulatory changes and policy enforcement.',
    capabilities: [
      'Real-time regulatory tracking',
      'Automated audit trail generation',
      'Policy violation detection',
      'Compliance report automation',
    ],
  },
] as const;

export const PLATFORM_FEATURES = [
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
    stats: { value: '99.7%', label: 'accuracy rate' },
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
] as const;

export const ANIMATED_METRICS = [
  { label: 'Contracts Processed', value: 2500000, suffix: '+', decimals: 0 },
  { label: 'Time Saved', value: 87, suffix: '%', decimals: 0 },
  {
    label: 'Cost Reduction',
    value: 18,
    prefix: '$',
    suffix: 'M',
    decimals: 0,
  },
  { label: 'Accuracy Rate', value: 99.7, suffix: '%', decimals: 1 },
] as const;

export const DEMO_SCENARIOS = [
  {
    title: 'Contract Analysis Demo',
    steps: [
      'Upload contract document',
      'AI extracts key terms and clauses',
      'Risk assessment and scoring',
      'Generate actionable insights',
    ],
  },
  {
    title: 'Vendor Evaluation Demo',
    steps: [
      'Import vendor data',
      'Performance metrics analysis',
      'Compliance verification',
      'Generate recommendation report',
    ],
  },
  {
    title: 'Negotiation Assistant Demo',
    steps: [
      'Input negotiation parameters',
      'AI suggests optimal terms',
      'Real-time strategy adjustment',
      'Final agreement generation',
    ],
  },
  {
    title: 'Compliance Monitoring Demo',
    steps: [
      'Connect to regulatory feeds',
      'Scan active contracts',
      'Identify compliance gaps',
      'Auto-generate remediation plan',
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