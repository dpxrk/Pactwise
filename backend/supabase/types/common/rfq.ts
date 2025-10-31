/**
 * RFQ/RFP System Types
 * Types for Request for Quote/Proposal management
 */

// ============================================================================
// ENUMS
// ============================================================================

export type RFQStatus =
  | 'draft'
  | 'published'
  | 'questions'
  | 'bidding'
  | 'evaluation'
  | 'awarded'
  | 'cancelled'
  | 'closed';

export type BidStatus =
  | 'invited'
  | 'acknowledged'
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'rejected'
  | 'awarded';

export type RFQType = 'RFQ' | 'RFP';

// ============================================================================
// CORE TYPES
// ============================================================================

export interface RFQ {
  id: string;
  enterprise_id: string;

  // Basic Information
  rfq_number: string;
  title: string;
  type: RFQType;
  status: RFQStatus;
  category: string | null;

  // Requirements
  requirements: Record<string, unknown>;
  specifications: string | null;
  estimated_value: number | null;

  // Evaluation Criteria
  evaluation_criteria: Record<string, unknown>;
  evaluation_weights: EvaluationWeights;

  // Timeline
  response_deadline: string;
  qa_deadline: string | null;

  // Document
  document_url: string | null;
  document_metadata: Record<string, unknown>;
  attachments: Attachment[];

  // Status Tracking
  published_at: string | null;
  awarded_at: string | null;
  cancelled_at: string | null;
  closed_at: string | null;
  cancellation_reason: string | null;

  // Vendor Tracking
  invited_vendor_ids: string[];
  received_bid_ids: string[];
  winning_bid_id: string | null;

  // Metadata
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RFQBid {
  id: string;
  rfq_id: string;
  vendor_id: string;

  // Bid Information
  status: BidStatus;
  total_price: number | null;
  currency: string;
  validity_days: number;

  // Proposal Details
  pricing: PricingDetails;
  technical_proposal: Record<string, unknown>;
  delivery_timeline: Record<string, unknown>;
  payment_terms: string | null;

  // Supporting Documents
  attachments: Attachment[];
  references: Reference[];

  // Evaluation
  score: number | null;
  rank: number | null;
  evaluation: BidEvaluation | null;
  compliance_checklist: Record<string, boolean>;
  compliance_score: number | null;

  // Status Tracking
  submitted_at: string | null;
  evaluated_at: string | null;
  rejection_reason: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface RFQQuestion {
  id: string;
  rfq_id: string;
  vendor_id: string;

  // Question Details
  question: string;
  answer: string | null;
  is_public: boolean;

  // Tracking
  submitted_at: string;
  answered_at: string | null;
  answered_by: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface EvaluationWeights {
  price: number;
  quality: number;
  delivery: number;
  experience: number;
  [key: string]: number;
}

export interface PricingDetails {
  total_price?: number;
  breakdown?: PricingBreakdown[];
  discounts?: Discount[];
  taxes?: Tax[];
}

export interface PricingBreakdown {
  item: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Discount {
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
}

export interface Tax {
  name: string;
  rate: number;
  amount: number;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
}

export interface Reference {
  company: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  relationship: string;
  duration?: string;
  description?: string;
}

export interface BidEvaluation {
  total_score: number;
  scores: {
    price: number;
    quality: number;
    delivery: number;
    experience: number;
    [key: string]: number;
  };
  weighted_scores: {
    price: number;
    quality: number;
    delivery: number;
    experience: number;
    [key: string]: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface RFQTimeline {
  publish: string;
  qa_deadline: string;
  submission_deadline: string;
  evaluation_complete: string;
  award: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateRFQRequest {
  title: string;
  type: RFQType;
  category?: string;
  requirements: Record<string, unknown>;
  specifications?: string;
  estimated_value?: number;
  evaluation_criteria: Record<string, unknown>;
  evaluation_weights?: Partial<EvaluationWeights>;
  response_days?: number;
  qa_days?: number;
  timeline?: Partial<RFQTimeline>;
  terms?: Record<string, unknown>;
  attachments?: Attachment[];
}

export interface SubmitBidRequest {
  rfq_id: string;
  vendor_id: string;
  total_price: number;
  currency?: string;
  pricing: PricingDetails;
  technical_proposal: Record<string, unknown>;
  delivery_timeline: Record<string, unknown>;
  payment_terms?: string;
  references?: Reference[];
  attachments?: Attachment[];
  validity_days?: number;
}

export interface EvaluateBidsRequest {
  rfq_id: string;
  evaluation_criteria?: Record<string, unknown>;
  weights?: Partial<EvaluationWeights>;
}

export interface SelectVendorRequest {
  rfq_id: string;
  bid_id?: string; // If not provided, auto-select highest scoring bid
  justification?: string;
}

export interface SubmitQuestionRequest {
  rfq_id: string;
  vendor_id: string;
  question: string;
  is_public?: boolean;
}

export interface AnswerQuestionRequest {
  rfq_id: string;
  question_id: string;
  answer: string;
}

// ============================================================================
// STATISTICS AND ANALYTICS
// ============================================================================

export interface RFQStatistics {
  rfq_id: string;
  status: RFQStatus;
  vendors_invited: number;
  bids_received: number;
  response_rate: number;
  questions_count: number;
  unanswered_questions: number;
  evaluated_bids: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  time_remaining_hours: number;
}

export interface BidComparison {
  rfq_id: string;
  bids: BidComparisonItem[];
  summary: BidComparisonSummary;
  recommendation: VendorRecommendation;
}

export interface BidComparisonItem {
  bid_id: string;
  vendor_id: string;
  vendor_name: string;
  total_price: number;
  score: number;
  rank: number;
  strengths: string[];
  weaknesses: string[];
  price_vs_average: number;
  price_vs_lowest: number;
}

export interface BidComparisonSummary {
  total_bids: number;
  qualified_bids: number;
  average_price: number;
  lowest_price: number;
  highest_price: number;
  average_score: number;
  price_range_percentage: number;
}

export interface VendorRecommendation {
  recommended_vendor_id: string;
  recommended_bid_id: string;
  score: number;
  rank: number;
  rationale: string[];
  savings_vs_average?: number;
  savings_vs_highest?: number;
  savings_percentage?: number;
}

// ============================================================================
// AGENT PROCESSING TYPES
// ============================================================================

export interface RFQAgentContext {
  rfq_id?: string;
  bid_id?: string;
  vendor_id?: string;
  operation: RFQOperation;
  user_id?: string;
}

export type RFQOperation =
  | 'create_rfp'
  | 'create_rfq'
  | 'publish_rfp'
  | 'invite_vendors'
  | 'submit_question'
  | 'answer_question'
  | 'submit_bid'
  | 'evaluate_bids'
  | 'select_vendor'
  | 'get_rfp_status'
  | 'extend_deadline'
  | 'cancel_rfp'
  | 'generate_comparison'
  | 'finalize_award';

export interface RFQAgentResult {
  rfq_id?: string;
  bid_id?: string;
  status?: RFQStatus | BidStatus;
  statistics?: RFQStatistics;
  bids?: RFQBid[];
  comparison?: BidComparison;
  recommendation?: VendorRecommendation;
  message: string;
  next_steps?: string[];
}
