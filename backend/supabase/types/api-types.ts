/**
 * Strongly typed API interfaces to replace any types
 */

import { Database } from './database';

// Database type aliases for convenience
export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];

// Table row types
export type Contract = Tables['contracts']['Row'];
export type Vendor = Tables['vendors']['Row'];
export type User = Tables['users']['Row'];
export type Enterprise = Tables['enterprises']['Row'];
export type Budget = Tables['budgets']['Row'];
export type AgentTask = Tables['agent_tasks']['Row'];
export type Notification = Tables['notifications']['Row'];

// Insert/Update types
export type ContractInsert = Tables['contracts']['Insert'];
export type ContractUpdate = Tables['contracts']['Update'];
export type VendorInsert = Tables['vendors']['Insert'];
export type VendorUpdate = Tables['vendors']['Update'];

// Enum types
export type UserRole = Enums['user_role'];
export type ContractStatus = Enums['contract_status'];
export type VendorStatus = Enums['vendor_status'];
export type RiskLevel = Enums['risk_level'];

// API Request/Response types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  pagination?: PaginationResponse;
  metadata?: Record<string, unknown>;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

// Contract specific types
export interface ContractWithVendor extends Contract {
  vendor?: Vendor;
}

export interface ContractAnalysisResult {
  contractId: string;
  riskScore: number;
  complianceScore: number;
  keyFindings: string[];
  recommendations: string[];
  analysisType: 'risk' | 'compliance' | 'full' | 'quick';
  confidence: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
}

// Vendor specific types
export interface VendorPerformanceMetrics {
  vendorId: string;
  performanceScore: number;
  complianceScore: number;
  contractCount: number;
  totalValue: number;
  riskLevel: RiskLevel;
  lastReviewDate?: Date;
}

// Agent task types
export interface AgentTaskInput {
  taskType: string;
  priority?: number;
  data: Record<string, unknown>;
  options?: {
    timeout?: number;
    retryCount?: number;
    scheduledAt?: Date;
  };
}

export interface AgentTaskResult {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
  completedAt?: Date;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  authId: string;
  enterpriseId: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  email: string;
  isActive: boolean;
  settings?: UserSettings;
}

export interface UserSettings {
  notifications?: NotificationSettings;
  preferences?: UserPreferences;
  theme?: 'light' | 'dark' | 'system';
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  contractExpiry: boolean;
  budgetAlerts: boolean;
  vendorUpdates: boolean;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
}

// Dashboard types
export interface DashboardStats {
  contracts: {
    total: number;
    active: number;
    expiringSoon: number;
    totalValue: number;
    averageRisk: number;
  };
  vendors: {
    total: number;
    active: number;
    highRisk: number;
    averagePerformance: number;
  };
  budgets: {
    total: number;
    allocated: number;
    spent: number;
    atRisk: number;
  };
  tasks: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

// Search types
export interface SearchParams {
  query: string;
  filters?: SearchFilters;
  pagination?: PaginationParams;
}

export interface SearchFilters {
  type?: ('contracts' | 'vendors' | 'budgets')[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: string[];
  tags?: string[];
  enterpriseId?: string;
}

export interface SearchResult<T = unknown> {
  id: string;
  type: 'contract' | 'vendor' | 'budget' | 'document';
  title: string;
  description?: string;
  score: number;
  highlights?: string[];
  data: T;
}

// Notification types
export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: Record<string, unknown>;
  actionUrl?: string;
}

export type NotificationType = 
  | 'contract_expiry'
  | 'budget_alert'
  | 'vendor_update'
  | 'task_completed'
  | 'approval_required'
  | 'system_alert';

// Budget types
export interface BudgetWithAllocations extends Budget {
  allocations?: BudgetAllocation[];
  owner?: User;
  department?: Department;
}

export interface BudgetAllocation {
  id: string;
  budgetId: string;
  contractId?: string;
  vendorId?: string;
  amount: number;
  description?: string;
  allocatedAt: Date;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  parentId?: string;
}

// File upload types
export interface FileUploadParams {
  file: File;
  bucket: string;
  path?: string;
  metadata?: Record<string, string>;
}

export interface FileUploadResult {
  id: string;
  path: string;
  url: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, string>;
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// Middleware context types
export interface RequestContext {
  req: Request;
  user?: AuthUser;
  isAuthenticated: boolean;
  userTier?: 'free' | 'professional' | 'enterprise';
  rateLimitResult?: RateLimitInfo;
  traceId?: string;
}

// Validation schemas result types
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Cache types
export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: Date;
  metadata?: {
    hitCount: number;
    createdAt: Date;
    lastAccessed: Date;
  };
}

// Performance monitoring types
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: Date;
  tags?: Record<string, string>;
}

// Security monitoring types
export interface SecurityEvent {
  eventType: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

// Compliance types
export interface ComplianceCheck {
  framework: 'GDPR' | 'HIPAA' | 'SOC2' | 'ISO27001';
  status: 'compliant' | 'non_compliant' | 'partial';
  checks: ComplianceCheckItem[];
  timestamp: Date;
}

export interface ComplianceCheckItem {
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  details?: string;
}

// Export utility type helpers
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<ApiResponse<T>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;