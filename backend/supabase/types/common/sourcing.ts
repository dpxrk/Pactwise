/**
 * Sourcing System Types
 * Types for intelligent supplier discovery and sourcing
 */

// ============================================================================
// ENUMS
// ============================================================================

export type SourcingStatus =
  | 'draft'
  | 'searching'
  | 'evaluating'
  | 'rfq_sent'
  | 'completed'
  | 'cancelled';

export type SupplierSource =
  | 'existing_vendor'
  | 'marketplace'
  | 'web_scraping'
  | 'industry_db'
  | 'manual';

// ============================================================================
// CORE TYPES
// ============================================================================

export interface SourcingRequest {
  id: string;
  enterprise_id: string;

  // Request Details
  title: string;
  category: string;
  specifications: string;
  quantity: number;
  unit_of_measure: string | null;

  // Requirements
  required_by: string | null; // Date
  budget_max: number | null;
  budget_currency: string;
  preferred_vendor_ids: string[];

  // Status
  status: SourcingStatus;

  // Results
  discovered_supplier_count: number;
  qualified_supplier_count: number;
  rfq_id: string | null;

  // Recommendations
  recommendations: SourcingRecommendations;

  // Metadata
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DiscoveredSupplier {
  id: string;
  sourcing_request_id: string;

  // Supplier Information
  vendor_id: string | null; // NULL if new/external supplier
  supplier_name: string;
  source: SupplierSource;

  // Contact Information
  email: string | null;
  phone: string | null;
  website: string | null;
  country: string | null;

  // Capabilities
  categories: string[];
  capabilities: Record<string, unknown>;

  // Evaluation Scores
  match_score: number; // 0-1
  risk_score: number; // 0-1
  total_score: number; // 0-1

  // Assessment
  can_fulfill_quantity: boolean;
  estimated_price: number | null;
  estimated_lead_time_days: number | null;

  // Performance Data (if existing vendor)
  on_time_delivery_rate: number | null;
  quality_rating: number | null;

  // Metadata
  discovered_at: string;
  evaluated_at: string | null;
  created_at: string;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface SourcingRecommendations {
  primary_recommendation?: PrimaryRecommendation;
  alternative_options?: AlternativeOption[];
  rfq_status?: RFQStatus;
  insights?: SourcingInsight[];
}

export interface PrimaryRecommendation {
  supplier_id: string;
  supplier_name: string;
  score: number;
  reasons: string[];
  estimated_price?: number;
  lead_time_days?: number;
}

export interface AlternativeOption {
  supplier_id: string;
  supplier_name: string;
  score: number;
  differentiator?: string;
}

export interface RFQStatus {
  sent: boolean;
  rfq_id: string;
  rfq_number?: string;
  sent_to_count: number;
  response_deadline: string;
}

export interface SourcingInsight {
  type: 'market_trend' | 'pricing' | 'availability' | 'risk' | 'recommendation';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  details?: Record<string, unknown>;
}

export interface SupplierRiskAssessment {
  total_risk: number; // 0-1
  risk_factors: {
    country_risk: number;
    financial_risk: number;
    performance_risk: number;
    compliance_risk: number;
  };
  risk_level: 'low' | 'medium' | 'high';
  mitigation_recommendations?: string[];
}

export interface SupplierMatchAnalysis {
  match_score: number; // 0-1
  match_factors: {
    category_match: number;
    specification_match: number;
    capability_match: number;
    geographic_match: number;
  };
  match_details: string[];
  gaps?: string[];
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateSourcingRequestPayload {
  title?: string;
  category: string;
  specifications: string;
  quantity: number;
  unit_of_measure?: string;
  required_by?: string; // ISO date string
  budget_max?: number;
  budget_currency?: string;
  preferred_vendor_ids?: string[];
  auto_send_rfq?: boolean;
}

export interface SourcingResult {
  request_id: string;
  suppliers: SupplierSummary[];
  rfq_status: RFQStatus | null;
  recommendations: SourcingRecommendations;
  total_suppliers_evaluated: number;
  qualified_count: number;
}

export interface SupplierSummary {
  id: string;
  name: string;
  source: SupplierSource;
  country: string | null;
  match_score: number;
  risk_score: number;
  total_score: number;
  categories: string[];
  is_existing_vendor: boolean;
}

export interface SupplierDiscoveryConfig {
  enable_web_scraping: boolean;
  enable_industry_db: boolean;
  marketplaces: string[];
  max_suppliers_to_evaluate: number;
  min_match_score: number;
  max_risk_score: number;
  auto_send_rfq: boolean;
}

// ============================================================================
// AGENT PROCESSING TYPES
// ============================================================================

export interface SourcingAgentContext {
  sourcing_request_id?: string;
  supplier_id?: string;
  operation: SourcingOperation;
  user_id?: string;
}

export type SourcingOperation =
  | 'create_sourcing_request'
  | 'search_suppliers'
  | 'evaluate_supplier'
  | 'send_rfqs'
  | 'get_sourcing_status'
  | 'update_sourcing_request'
  | 'cancel_sourcing_request';

export interface SourcingAgentResult {
  sourcing_request_id?: string;
  status?: SourcingStatus;
  suppliers?: DiscoveredSupplier[];
  supplier_count?: number;
  qualified_count?: number;
  rfq_status?: RFQStatus;
  recommendations?: SourcingRecommendations;
  message: string;
  next_steps?: string[];
}

// ============================================================================
// MARKETPLACE INTEGRATION TYPES
// ============================================================================

export interface MarketplaceSupplier {
  marketplace: string;
  supplier_id: string;
  name: string;
  description?: string;
  rating?: number;
  review_count?: number;
  verification_status?: string;
  country?: string;
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  capabilities?: string[];
  certifications?: string[];
  min_order_quantity?: number;
  price_range?: {
    min?: number;
    max?: number;
    currency?: string;
  };
}

export interface WebScrapingResult {
  source_url: string;
  scraped_at: string;
  suppliers: MarketplaceSupplier[];
  errors?: string[];
}

// ============================================================================
// SUPPLIER MATCHING TYPES
// ============================================================================

export interface SupplierMatchRequest {
  specifications: string;
  category: string;
  quantity: number;
  required_by?: string;
  budget_max?: number;
}

export interface SupplierMatchResult {
  supplier: DiscoveredSupplier | MarketplaceSupplier;
  match_analysis: SupplierMatchAnalysis;
  risk_assessment: SupplierRiskAssessment;
  recommendation: 'highly_recommended' | 'recommended' | 'acceptable' | 'not_recommended';
}
