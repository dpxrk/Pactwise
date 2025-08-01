
export interface VendorCategory {
  name: string;
  count: number;
  spend: number;
}

export interface VendorPerformanceItem {
  id: string;
  name: string;
  category: string;
  spend: number;
  performance: number;
}

export interface VendorPortfolio {
  vendors: VendorPerformanceItem[];
  totalSpend: number;
  categories: VendorCategory[];
}

export interface NewVendorEvaluationData {
  documentation?: {
    businessLicense?: boolean;
    insurance?: boolean;
    taxId?: boolean;
    bankDetails?: boolean;
  };
  financial?: {
    revenue?: number;
    profitMargin?: number;
    debtRatio?: number;
    creditScore?: number;
  };
  references?: {
    rating: number;
    concern?: string;
  }[];
  requiredCapabilities?: string[];
  vendorCapabilities?: string[];
  pricing?: {
    total?: number;
    negotiable?: boolean;
    volumeDiscounts?: boolean;
    breakdown?: Record<string, number>;
  };
  marketBenchmark?: {
    average?: number;
  };
  vendorSize?: 'small' | 'medium' | 'large';
  projectSize?: 'small' | 'medium' | 'large';
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
    negotiable?: boolean;
    volumeDiscounts?: boolean;
    breakdown?: Record<string, number>;
  };
  marketBenchmark?: {
    average?: number;
  };
}

export interface NewVendorRiskData {
  vendorSize?: 'small' | 'medium' | 'large';
  projectSize?: 'small' | 'medium' | 'large';
  vendorLocation?: {
    country?: string;
  };
  companyLocation?: {
    country?: string;
  };
}

export interface EstimateVendorSizeData {
  revenue?: number;
  financial?: {
    revenue?: number;
  };
  employees?: number;
}

export interface ReferenceItem {
  rating: number;
  concern?: string;
}
