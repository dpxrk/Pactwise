import { useEffect, useState, useCallback } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Tables } from '@/types/database.types'

import { useSupabaseQuery, useSupabaseRealtime, useSupabaseMutation } from './useSupabase'

type Contract = Tables<'contracts'>
type ContractInsert = Tables<'contracts'>['Insert']
type ContractUpdate = Tables<'contracts'>['Update']

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
  const [contracts, setContracts] = useState<Contract[]>([])
  
  const buildQuery = useCallback(() => {
    let query = supabase
      .from('contracts')
      .select(`
        *,
        vendors (
          id,
          name,
          email,
          status
        ),
        departments (
          id,
          name
        ),
        contract_documents (
          id,
          file_name,
          file_path,
          file_size,
          uploaded_at
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
  }, [userProfile, options])

  const { data, isLoading, error, refetch } = useSupabaseQuery(
    async () => {
      const result = await buildQuery()
      return { data: result.data, error: result.error }
    },
    {
      enabled: !!userProfile?.enterprise_id
    }
  )

  useEffect(() => {
    if (data) {
      setContracts(data as Contract[])
    }
  }, [data])

  // Real-time subscription
  const { isSubscribed } = useSupabaseRealtime('contracts', {
    filter: userProfile?.enterprise_id ? `enterprise_id=eq.${userProfile.enterprise_id}` : undefined,
    onInsert: (payload) => {
      if (options.realtime) {
        setContracts(prev => [...prev, payload.new as Contract])
      }
    },
    onUpdate: (payload) => {
      if (options.realtime) {
        setContracts(prev => 
          prev.map(contract => 
            contract.id === payload.new.id ? payload.new as Contract : contract
          )
        )
      }
    },
    onDelete: (payload) => {
      if (options.realtime) {
        setContracts(prev => 
          prev.filter(contract => contract.id !== payload.old.id)
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
  
  const { data, isLoading, error, refetch } = useSupabaseQuery(
    async () => {
      const result = await supabase
        .from('contracts')
        .select(`
          *,
          vendors (
            id,
            name,
            email,
            status,
            contact_person,
            phone
          ),
          departments (
            id,
            name
          ),
          contract_documents (
            id,
            file_name,
            file_path,
            file_size,
            uploaded_at
          ),
          contract_versions (
            id,
            version_number,
            change_summary,
            created_at,
            created_by
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
        .eq('enterprise_id', userProfile?.enterprise_id)
        .single()
      
      return { data: result.data, error: result.error }
    },
    {
      enabled: !!contractId && !!userProfile?.enterprise_id
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
    contract: data as (Contract & {
      vendors: Tables<'vendors'>
      departments: Tables<'departments'>
      contract_documents: Tables<'contract_documents'>[]
      contract_versions: Tables<'contract_versions'>[]
      contract_clauses: Tables<'contract_clauses'>[]
    }) | null,
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
        .eq('enterprise_id', userProfile?.enterprise_id)
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
    results: data as Contract[] || [],
    isLoading,
    error
  }
}