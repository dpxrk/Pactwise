// Shared database types for both frontend and admin apps

export type UserRole = 'owner' | 'admin' | 'manager' | 'user' | 'viewer';

export interface User {
  id: string;
  auth_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  enterprise_id: string;
  department?: string;
  title?: string;
  phone_number?: string;
  is_active: boolean;
  last_login_at?: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Enterprise {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  contract_volume?: number;
  primary_use_case?: string;
  parent_enterprise_id?: string;
  is_parent_organization?: boolean;
  allow_child_organizations?: boolean;
  access_pin?: string;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Contract {
  id: string;
  title: string;
  status: 'draft' | 'pending_review' | 'active' | 'expired' | 'terminated';
  contract_type?: string;
  file_name?: string;
  file_type?: string;
  storage_id?: string;
  start_date?: string;
  end_date?: string;
  value?: number;
  is_auto_renew?: boolean;
  notes?: string;
  vendor_id?: string;
  enterprise_id: string;
  owner_id?: string;
  department_id?: string;
  created_by: string;
  last_modified_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  status: 'active' | 'inactive' | 'pending';
  website?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  performance_score?: number;
  compliance_score?: number;
  total_contract_value?: number;
  active_contracts?: number;
  enterprise_id: string;
  created_by?: string;
  metadata?: Record<string, any>;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}