/**
 * TypeScript types for normalized database tables
 * Generated after migrations 046, 047, 048
 */

// ============================================================================
// User Organization Structure (Migration 046)
// ============================================================================

export interface Department {
  id: string;
  enterprise_id: string;
  name: string;
  description?: string | null;
  parent_department_id?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  parent_department?: Department;
  sub_departments?: Department[];
  job_titles?: JobTitle[];
}

export interface JobTitle {
  id: string;
  enterprise_id: string;
  title: string;
  department_id?: string | null;
  level?: number | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  department?: Department;
  user_positions?: UserPosition[];
}

export interface UserPosition {
  id: string;
  user_id: string;
  department_id?: string | null;
  job_title_id?: string | null;
  is_primary: boolean;
  start_date: string;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  user?: User;
  department?: Department;
  job_title?: JobTitle;
}

// Extended User type with new relations
export interface UserWithPositions extends User {
  primary_department_id?: string | null;
  primary_job_title_id?: string | null;
  // Relations
  primary_department?: Department;
  primary_job_title?: JobTitle;
  user_positions?: UserPosition[];
}

// ============================================================================
// Payment Methods Structure (Migration 047)
// ============================================================================

export interface PaymentMethodCard {
  id: string;
  payment_method_id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  fingerprint?: string | null;
  funding?: 'credit' | 'debit' | 'prepaid' | 'unknown' | null;
  country?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  payment_method?: PaymentMethod;
}

export interface PaymentMethodBankAccount {
  id: string;
  payment_method_id: string;
  bank_name?: string | null;
  last4: string;
  routing_number?: string | null;
  account_type?: 'checking' | 'savings' | null;
  account_holder_name?: string | null;
  account_holder_type?: 'individual' | 'company' | null;
  country?: string | null;
  currency?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  payment_method?: PaymentMethod;
}

// Extended PaymentMethod type with new relations
export interface PaymentMethodWithDetails extends PaymentMethod {
  has_card_details?: boolean;
  has_bank_details?: boolean;
  // Relations
  payment_method_cards?: PaymentMethodCard[];
  payment_method_bank_accounts?: PaymentMethodBankAccount[];
}

// ============================================================================
// Address Structure (Migration 048)
// ============================================================================

export interface Address {
  id: string;
  entity_type: 'vendor' | 'enterprise' | 'user' | 'contract';
  entity_id: string;
  address_type: 'primary' | 'billing' | 'shipping' | 'legal';
  street_address_1?: string | null;
  street_address_2?: string | null;
  city?: string | null;
  state_province?: string | null;
  postal_code?: string | null;
  country?: string | null; // ISO country code
  formatted_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_verified: boolean;
  is_primary: boolean;
  enterprise_id: string;
  created_at: string;
  updated_at: string;
  // Relations
  enterprise?: Enterprise;
}

// Extended types with address relations
export interface VendorWithAddress extends Vendor {
  primary_address_id?: string | null;
  // Relations
  primary_address?: Address;
  addresses?: Address[];
}

export interface ContractWithAddress extends Contract {
  legal_address_id?: string | null;
  // Relations
  legal_address?: Address;
  addresses?: Address[];
}

// ============================================================================
// Vendor Contacts (Migration 044 - Already applied)
// ============================================================================

export interface Contact {
  id: string;
  vendor_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  vendor?: Vendor;
}

export interface VendorWithContacts extends Vendor {
  // Relations
  contacts?: Contact[];
  primary_contact?: Contact;
}

// ============================================================================
// Contract Extractions (Migration 045 - Already applied)
// ============================================================================

export interface ContractExtraction {
  id: string;
  contract_id: string;
  extracted_parties?: any;
  extracted_address?: string | null;
  extracted_start_date?: string | null;
  extracted_end_date?: string | null;
  extracted_payment_schedule?: any;
  extracted_pricing?: any;
  extracted_scope?: string | null;
  extracted_key_terms?: any;
  created_at: string;
  updated_at: string;
  // Relations
  contract?: Contract;
}

export interface ContractWithExtractions extends Contract {
  // Relations
  contract_extractions?: ContractExtraction;
}

// ============================================================================
// Helper Types for Queries
// ============================================================================

// Query result types that include all relations
export interface FullUserProfile {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role: UserRole;
  enterprise_id: string;
  is_active: boolean;
  // New normalized relations
  primary_department?: Department;
  primary_job_title?: JobTitle;
  user_positions?: UserPosition[];
  // Enterprise
  enterprise?: Enterprise;
}

export interface FullVendorProfile {
  id: string;
  name: string;
  category: VendorCategory;
  status: VendorStatus;
  // New normalized relations
  contacts?: Contact[];
  primary_address?: Address;
  addresses?: Address[];
  // Existing relations
  contracts?: Contract[];
  enterprise?: Enterprise;
}

export interface FullContractDetails {
  id: string;
  title: string;
  status: ContractStatus;
  // New normalized relations
  contract_extractions?: ContractExtraction;
  legal_address?: Address;
  // Existing relations
  vendor?: Vendor;
  owner?: User;
  enterprise?: Enterprise;
}

export interface FullPaymentMethodDetails {
  id: string;
  type: string;
  is_default: boolean;
  // New normalized relations
  card_details?: PaymentMethodCard;
  bank_details?: PaymentMethodBankAccount;
  // Existing relations
  enterprise?: Enterprise;
}

// ============================================================================
// Enums (for reference)
// ============================================================================

export type UserRole = 'viewer' | 'user' | 'manager' | 'admin' | 'owner';
export type VendorCategory = 'saas' | 'professional_services' | 'hardware' | 'other';
export type VendorStatus = 'active' | 'inactive' | 'pending' | 'suspended';
export type ContractStatus = 'draft' | 'pending' | 'active' | 'expired' | 'cancelled';

// ============================================================================
// Import base types (these should exist in your codebase)
// ============================================================================

import type { 
  User, 
  Vendor, 
  Contract, 
  Enterprise, 
  PaymentMethod 
} from './database';

// ============================================================================
// Utility Types for API Responses
// ============================================================================

export interface NormalizedApiResponse<T> {
  data: T;
  includes?: {
    departments?: Department[];
    job_titles?: JobTitle[];
    addresses?: Address[];
    contacts?: Contact[];
    extractions?: ContractExtraction[];
  };
}

// Type guards
export function hasCardDetails(
  method: PaymentMethodWithDetails
): method is PaymentMethodWithDetails & { payment_method_cards: PaymentMethodCard[] } {
  return method.type === 'card' && !!method.payment_method_cards?.length;
}

export function hasBankDetails(
  method: PaymentMethodWithDetails
): method is PaymentMethodWithDetails & { payment_method_bank_accounts: PaymentMethodBankAccount[] } {
  return method.type === 'bank_account' && !!method.payment_method_bank_accounts?.length;
}

export function isPrimaryPosition(position: UserPosition): boolean {
  return position.is_primary && !position.end_date;
}

export function isPrimaryAddress(address: Address): boolean {
  return address.is_primary;
}