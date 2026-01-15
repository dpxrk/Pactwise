/**
 * Contracts API Service Layer
 * Provides all contract-related API calls to Supabase
 * NO HARDCODED DATA - Everything from the database
 */

import type { Database } from '@/types/database.types';
import { createClient } from '@/utils/supabase/client';

type Contract = Database['public']['Tables']['contracts']['Row'];
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];
type ContractUpdate = Database['public']['Tables']['contracts']['Update'];
type ContractAnalysis = any; // Table not yet in database types

export class ContractsAPI {
  private supabase = createClient();

  /**
   * Get a single contract with all related data
   */
  async getContract(id: string): Promise<Contract & { vendor?: any; analyses?: ContractAnalysis[] }> {
    const { data, error } = await (this.supabase as any)
      .from('contracts')
      .select(`
        *,
        vendor:vendors(*),
        analyses:contract_analyses(*),
        documents:contract_documents(*),
        obligations:contract_obligations(*),
        milestones:contract_milestones(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching contract:', error);
      throw new Error(`Failed to fetch contract: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all contracts for an enterprise with filtering
   */
  async getContracts(filters?: {
    enterpriseId?: string;
    status?: string;
    vendorId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = this.supabase
      .from('contracts')
      .select(`
        *,
        vendor:vendors(id, name, status),
        analyses:contract_analyses(id, status, risk_score)
      `, { count: 'exact' });

    if (filters?.enterpriseId) {
      query = query.eq('enterprise_id', filters.enterpriseId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status as any);
    }
    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }
    if (filters?.startDate) {
      query = query.gte('start_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('end_date', filters.endDate);
    }

    // Pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    // Order by most recent first
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching contracts:', error);
      throw new Error(`Failed to fetch contracts: ${error.message}`);
    }

    return { data, count };
  }

  /**
   * Create a new contract
   */
  async createContract(contract: ContractInsert): Promise<Contract> {
    const { data, error } = await this.supabase
      .from('contracts')
      .insert(contract)
      .select()
      .single();

    if (error) {
      console.error('Error creating contract:', error);
      throw new Error(`Failed to create contract: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing contract
   */
  async updateContract(id: string, updates: ContractUpdate): Promise<Contract> {
    const { data, error } = await this.supabase
      .from('contracts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contract:', error);
      throw new Error(`Failed to update contract: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a contract (soft delete)
   */
  async deleteContract(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('contracts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting contract:', error);
      throw new Error(`Failed to delete contract: ${error.message}`);
    }
  }

  /**
   * Trigger AI analysis of a contract
   */
  async analyzeContract(id: string): Promise<ContractAnalysis> {
    const { data, error } = await this.supabase.functions.invoke('ai-analysis', {
      body: { 
        contractId: id,
        analysisType: 'comprehensive'
      }
    });

    if (error) {
      console.error('Error analyzing contract:', error);
      throw new Error(`Failed to analyze contract: ${error.message}`);
    }

    return data;
  }

  /**
   * Get contract analytics for dashboard
   */
  async getContractAnalytics(enterpriseId: string) {
    const { data, error } = await this.supabase.rpc('get_contract_analytics', {
      p_enterprise_id: enterpriseId
    } as any);

    if (error) {
      console.error('Error fetching analytics:', error);
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }

    return data;
  }

  /**
   * Get contracts expiring soon
   */
  async getExpiringContracts(enterpriseId: string, daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await this.supabase
      .from('contracts')
      .select(`
        *,
        vendor:vendors(name, contact_email)
      `)
      .eq('enterprise_id', enterpriseId)
      .eq('status', 'active')
      .lte('end_date', futureDate.toISOString())
      .gte('end_date', new Date().toISOString())
      .order('end_date', { ascending: true });

    if (error) {
      console.error('Error fetching expiring contracts:', error);
      throw new Error(`Failed to fetch expiring contracts: ${error.message}`);
    }

    return data;
  }

  /**
   * Get contract value metrics
   */
  async getContractValueMetrics(enterpriseId: string) {
    const { data, error } = await (this.supabase as any).rpc('get_contract_value_metrics', {
      p_enterprise_id: enterpriseId
    });

    if (error) {
      console.error('Error fetching value metrics:', error);
      throw new Error(`Failed to fetch value metrics: ${error.message}`);
    }

    return data;
  }

  /**
   * Search contracts with full-text search
   */
  async searchContracts(searchTerm: string, enterpriseId: string) {
    const { data, error } = await (this.supabase as any).rpc('search_contracts', {
      search_term: searchTerm,
      p_enterprise_id: enterpriseId
    });

    if (error) {
      console.error('Error searching contracts:', error);
      throw new Error(`Failed to search contracts: ${error.message}`);
    }

    return data;
  }

  /**
   * Get contract status distribution
   */
  async getStatusDistribution(enterpriseId: string) {
    const { data, error } = await this.supabase
      .from('contracts')
      .select('status')
      .eq('enterprise_id', enterpriseId)
      .is('deleted_at', null);

    if (error) {
      console.error('Error fetching status distribution:', error);
      throw new Error(`Failed to fetch status distribution: ${error.message}`);
    }

    // Count by status
    const distribution = data.reduce((acc, contract) => {
      const status = contract.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return distribution;
  }

  /**
   * Upload contract document
   */
  async uploadContractDocument(contractId: string, file: File) {
    const fileName = `${contractId}/${Date.now()}-${file.name}`;
    
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('contract-documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading document:', uploadError);
      throw new Error(`Failed to upload document: ${uploadError.message}`);
    }

    // Store document reference in database
    const { data, error } = await (this.supabase as any)
      .from('contract_documents')
      .insert({
        contract_id: contractId,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing document reference:', error);
      throw new Error(`Failed to store document reference: ${error.message}`);
    }

    return data;
  }

  /**
   * Get contract timeline/history
   */
  async getContractHistory(contractId: string) {
    const { data, error } = await (this.supabase as any)
      .from('contract_history')
      .select(`
        *,
        user:users(id, first_name, last_name, email)
      `)
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contract history:', error);
      throw new Error(`Failed to fetch contract history: ${error.message}`);
    }

    return data;
  }
}

// Export singleton instance
export const contractsAPI = new ContractsAPI();