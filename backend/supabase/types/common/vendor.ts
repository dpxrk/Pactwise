
export interface Vendor {
  id: string;
  name: string;
  category: string;
  contractCount: number;
  totalSpend: number;
  activeContracts: number;
  performanceHistory: PerformanceHistoryItem[];
  deliveryMetrics: DeliveryMetrics;
  compliance: Compliance;
  issues: Issue[];
}

export interface PerformanceHistoryItem {
  month: string;
  score: number;
  issues: number;
}

export interface DeliveryMetrics {
  onTimeRate: number;
  qualityScore: number;
  responsiveness: number;
}

export interface Compliance {
  insurance: boolean;
  certifications: string[];
  lastAudit: string;
}

export interface Issue {
  date: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface VendorPortfolio {
    vendors: PortfolioVendor[];
    totalSpend: number;
    categories: VendorCategory[];
}

export interface PortfolioVendor {
    id: string;
    name: string;
    category: string;
    spend: number;
    performance: number;
}

export interface VendorCategory {
    name: string;
    count: number;
    spend: number;
}

export interface NewVendorEvaluation {
    basicChecks: BasicChecks;
    financialStability: FinancialStability;
    references: References;
    capabilities: Capabilities;
    pricing: Pricing;
    risks: NewVendorRisk[];
    score: number;
    recommendation: string;
}

export interface BasicChecks {
    passed: boolean;
    missing: string[];
    provided: string[];
    completeness: number;
}

export interface FinancialStability {
    riskLevel: 'low' | 'medium' | 'high';
    description: string;
    metrics: FinancialMetrics;
}

export interface FinancialMetrics {
    revenue: number;
    profitMargin: number;
    debtRatio: number;
    creditScore: number;
}

export interface References {
    averageRating: number;
    count: number;
    concerns: string[];
    breakdown?: {
        excellent: number;
        good: number;
        average: number;
        poor: number;
    };
}

export interface Capabilities {
    matchRate: number;
    matched: string[];
    missing: string[];
    additionalCapabilities: string[];
}

export interface Pricing {
    competitiveness: 'competitive' | 'above_market' | 'below_market';
    variance: number;
    breakdown: any; // Can be complex, leaving as any for now
    negotiable: boolean;
    volumeDiscounts: boolean;
}

export interface NewVendorRisk {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation: string;
}

export interface VendorProfile {
    name: string;
    category: string;
    engagementLength: string;
    spendLevel: string;
    contractComplexity: string;
    strategicImportance: string;
}

export interface PerformanceMetrics {
    overallScore: number;
    trend: 'improving' | 'declining' | 'stable';
    trendRate: number;
    deliveryScore: number;
    qualityScore: number;
    responsivenessScore: number;
    issueFrequency: string;
    components: {
        delivery: number;
        quality: number;
        responsiveness: number;
        issues: number;
    };
}

export interface RelationshipScore {
    score: number;
    factors: {
        performance: number;
        longevity: number;
        spend: number;
        issues: number;
        compliance: number;
    };
    strength: 'strong' | 'moderate' | 'weak';
    recommendations: string[];
}

export interface VendorRisk {
    type: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    impact: string;
    mitigation: string;
}

export interface Opportunity {
    type: string;
    description: string;
    potentialSaving?: number;
    potentialBenefit?: string;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
}

export interface ComplianceStatus {
    compliant: boolean;
    issues: string[];
    lastChecked: string;
    nextReviewDate: string;
}

export interface VendorAnalysis {
    profile: VendorProfile;
    performance: PerformanceMetrics;
    relationshipScore: RelationshipScore;
    risks: VendorRisk[];
    opportunities: Opportunity[];
    recommendations: string[];
    complianceStatus: ComplianceStatus;
}

export interface PortfolioSummary {
    totalVendors: number;
    totalSpend: number;
    avgSpendPerVendor: number;
    topCategory: string;
    avgPerformance: number;
}

export interface CategoryAnalysis {
    name: string;
    vendorCount: number;
    totalSpend: number;
    avgPerformance: number;
    riskLevel: 'low' | 'medium' | 'high';
    riskDescription: string;
    concentration: number;
}

export interface PerformanceDistribution {
    excellent: PortfolioVendor[];
    good: PortfolioVendor[];
    average: PortfolioVendor[];
    poorPerformers: PortfolioVendor[];
    summary: {
        excellentRate: number;
        goodRate: number;
        averageRate: number;
        poorRate: number;
    };
}

export interface SpendConcentration {
    topVendor: string;
    topVendorSpend: number;
    topVendorShare: number;
    top5Share: number;
    herfindahlIndex: number;
    concentrationLevel: 'low' | 'medium' | 'high';
}

export interface PortfolioRisk {
    components: {
        concentration: 'low' | 'medium' | 'high';
        performance: 'low' | 'medium' | 'high';
        diversity: 'low' | 'medium' | 'high';
    };
    overall: 'low' | 'medium' | 'high';
    description: string;
}

export interface PortfolioOptimization {
    type: string;
    category?: string;
    description: string;
    potentialSaving?: number;
    potentialBenefit?: string;
    affectedSpend?: number;
    complexity: 'low' | 'medium' | 'high';
}

export interface VendorInfo {
    name: string;
    category: string;
    contactInfo: {
        email: string | null;
        phone: string | null;
        address: string | null;
    };
    size: string;
    established: string | null;
}

export interface InitialAssessment {
    hasRedFlags: boolean;
    redFlags: string[];
    initialScore: number;
}

// Extended Vendor interface for various data scenarios
export interface ExtendedVendor extends Partial<Vendor> {
    vendorId?: string;
    description?: string;
    services?: string[];
    email?: string;
    phone?: string;
    address?: string;
    insurance?: boolean;
    references?: any[];
    complaints?: number;
    litigation?: boolean;
    established?: string;
    revenue?: number;
    employees?: number;
    financial?: {
        revenue?: number;
        profitMargin?: number;
        debtRatio?: number;
        creditScore?: number;
    };
}

export interface NewVendorEvaluationData {
    name?: string;
    description?: string;
    services?: string[];
    email?: string;
    phone?: string;
    address?: string;
    insurance?: boolean;
    references?: any[];
    complaints?: number;
    litigation?: boolean;
    documentation?: Record<string, any>;
    financial?: {
        revenue?: number;
        profitMargin?: number;
        debtRatio?: number;
        creditScore?: number;
    };
    requiredCapabilities?: string[];
    vendorCapabilities?: string[];
    pricing?: {
        total?: number;
        breakdown?: any;
        negotiable?: boolean;
        volumeDiscounts?: boolean;
    };
    marketBenchmark?: {
        average?: number;
    };
    vendorSize?: string;
    projectSize?: string;
    vendorLocation?: {
        country?: string;
    };
    companyLocation?: {
        country?: string;
    };
}

export interface CapabilitiesData {
    requiredCapabilities?: string[];
    vendorCapabilities?: string[];
}

export interface PricingData {
    pricing?: {
        total?: number;
        breakdown?: any;
        negotiable?: boolean;
        volumeDiscounts?: boolean;
    };
    marketBenchmark?: {
        average?: number;
    };
}

export interface NewVendorRiskData {
    vendorSize?: string;
    projectSize?: string;
    vendorLocation?: {
        country?: string;
    };
    companyLocation?: {
        country?: string;
    };
}

export interface EstimateVendorSizeData {
    revenue?: number;
    employees?: number;
    financial?: {
        revenue?: number;
    };
}
