import { useEffect, useState, useCallback } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/utils/supabase/client'
import { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

import { useSupabaseQuery, useSupabaseRealtime, useSupabaseMutation } from './useSupabase'

const supabase = createClient()

// Use database-generated types - vendor_id is now REQUIRED
type Contract = Tables<'contracts'>
type ContractInsert = TablesInsert<'contracts'>
type ContractUpdate = TablesUpdate<'contracts'>

// Contract with vendor information (vendor is always present since vendor_id is required)
type ContractWithVendor = Contract & {
  vendors: Tables<'vendors'>  // Not nullable since every contract has a vendor
}

// Contract detail with full relations
type ContractDetail = Contract & {
  vendors: Tables<'vendors'>  // Required
  contract_clauses?: Tables<'contract_clauses'>[]
}

interface UseContractsOptions {
  status?: Contract['status']
  vendorId?: string
  departmentId?: string
  limit?: number
  orderBy?: keyof Contract
  ascending?: boolean
  realtime?: boolean
}

export function useContracts(options: UseContractsOptions = {}) {
  const { userProfile } = useAuth()
  const [contracts, setContracts] = useState<ContractWithVendor[]>([])

  const buildQuery = useCallback(() => {
    let query = supabase
      .from('contracts')
      .select(`
        *,
        vendors (
          id,
          name,
          status,
          category,
          website,
          performance_score,
          compliance_score
        )
      `)

    if (userProfile?.enterprise_id) {
      query = query.eq('enterprise_id', userProfile.enterprise_id)
    }

    if (options.status) {
      query = query.eq('status', options.status)
    }

    if (options.vendorId) {
      query = query.eq('vendor_id', options.vendorId)
    }

    if (options.departmentId) {
      query = query.eq('department_id', options.departmentId)
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false })
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    return query
  }, [
    userProfile?.enterprise_id,
    options.status,
    options.vendorId,
    options.departmentId,
    options.orderBy,
    options.ascending,
    options.limit
  ])

  // Generate cache key for request deduplication and caching
  const cacheKey = `contracts:${userProfile?.enterprise_id}:${options.status || 'all'}:${options.vendorId || 'all'}:${options.departmentId || 'all'}:${options.orderBy || 'default'}:${options.ascending}:${options.limit || 'all'}`

  const { data, isLoading, isFetching, error, refetch } = useSupabaseQuery(
    async () => {
      const result = await buildQuery()
      return { data: result.data, error: result.error }
    },
    {
      enabled: !!userProfile?.enterprise_id,
      cacheKey,  // Enable caching and deduplication
      staleTime: 30000,  // Data fresh for 30 seconds
      refetchOnWindowFocus: false  // Don't refetch on tab switch
    }
  )

  useEffect(() => {
    if (data) {
      setContracts(data as unknown as ContractWithVendor[])
    }
  }, [data])

  // Real-time subscription
  const { isSubscribed } = useSupabaseRealtime('contracts', {
    filter: userProfile?.enterprise_id ? `enterprise_id=eq.${userProfile.enterprise_id}` : undefined,
    onInsert: (payload) => {
      if (options.realtime) {
        setContracts(prev => [...prev, payload.new as unknown as ContractWithVendor])
      }
    },
    onUpdate: (payload) => {
      if (options.realtime) {
        setContracts(prev =>
          prev.map(contract =>
            contract.id === (payload.new as any).id ? payload.new as unknown as ContractWithVendor : contract
          )
        )
      }
    },
    onDelete: (payload) => {
      if (options.realtime) {
        setContracts(prev =>
          prev.filter(contract => contract.id !== (payload.old as any).id)
        )
      }
    }
  })

  return {
    contracts,
    isLoading,
    error,
    refetch,
    isSubscribed: options.realtime ? isSubscribed : false
  }
}

export function useContract(contractId: string) {
  const { userProfile } = useAuth()

  const cacheKey = `contract:${contractId}:${userProfile?.enterprise_id}`

  const { data, isLoading, isFetching, error, refetch } = useSupabaseQuery(
    async () => {
      const result = await supabase
        .from('contracts')
        .select(`
          *,
          vendors (
            id,
            name,
            status,
            category,
            website,
            address,
            performance_score,
            compliance_score,
            total_contract_value,
            active_contracts
          ),
          contract_clauses (
            id,
            clause_type,
            content,
            is_critical,
            order_index
          )
        `)
        .eq('id', contractId)
        .eq('enterprise_id', userProfile!.enterprise_id!)
        .single()

      return { data: result.data, error: result.error }
    },
    {
      enabled: !!contractId && !!userProfile?.enterprise_id,
      cacheKey,
      staleTime: 60000,  // Single contract can be cached longer (60s)
      refetchOnWindowFocus: false
    }
  )

  // Real-time subscription for single contract
  useSupabaseRealtime('contracts', {
    filter: `id=eq.${contractId}`,
    onChange: () => {
      refetch()
    }
  })

  return {
    contract: data as ContractDetail | null,
    isLoading,
    error,
    refetch
  }
}

export function useContractMutations() {
  const { userProfile } = useAuth()
  const mutations = useSupabaseMutation('contracts')

  const createContract = useCallback(async (
    contract: Omit<ContractInsert, 'enterprise_id' | 'created_by' | 'updated_by'>,
    options?: {
      onSuccess?: (data: Contract[]) => void
      onError?: (error: Error) => void
    }
  ) => {
    if (!userProfile) {
      const error = new Error('User not authenticated')
      options?.onError?.(error)
      return { data: null, error }
    }

    return mutations.insert(
      {
        ...contract,
        enterprise_id: userProfile.enterprise_id!,
        created_by: userProfile.id,
        updated_by: userProfile.id
      } as ContractInsert,
      options
    )
  }, [userProfile, mutations])

  const updateContract = useCallback(async (
    contractId: string,
    updates: Omit<ContractUpdate, 'updated_by' | 'updated_at'>,
    options?: {
      onSuccess?: (data: Contract[]) => void
      onError?: (error: Error) => void
    }
  ) => {
    if (!userProfile) {
      const error = new Error('User not authenticated')
      options?.onError?.(error)
      return { data: null, error }
    }

    return mutations.update(
      {
        ...updates,
        updated_by: userProfile.id,
        updated_at: new Date().toISOString()
      } as ContractUpdate,
      { column: 'id', value: contractId },
      options
    )
  }, [userProfile, mutations])

  const deleteContract = useCallback(async (
    contractId: string,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    return mutations.remove(
      { column: 'id', value: contractId },
      options
    )
  }, [mutations])

  return {
    createContract,
    updateContract,
    deleteContract,
    isLoading: mutations.isLoading,
    error: mutations.error
  }
}

export function useContractSearch(searchTerm: string, options: { limit?: number } = {}) {
  const { userProfile } = useAuth()
  
  const { data, isLoading, error } = useSupabaseQuery(
    async () => {
      if (!searchTerm || searchTerm.length < 2) {
        return { data: [], error: null }
      }

      const result = await supabase
        .from('contracts')
        .select(`
          id,
          title,
          vendor_id,
          vendors (name),
          status,
          start_date,
          end_date,
          total_value
        `)
        .eq('enterprise_id', userProfile!.enterprise_id!)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(options.limit || 10)
      
      return { data: result.data, error: result.error }
    },
    {
      enabled: !!userProfile?.enterprise_id && searchTerm.length >= 2
    }
  )

  return {
    results: (data as unknown as Contract[]) || [],
    isLoading,
    error
  }
}