import { useEffect, useState, useCallback } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { Tables } from '@/types/database.types'
import { createClient } from '@/utils/supabase/client'

import { useSupabaseQuery, useSupabaseRealtime, useSupabaseMutation } from './useSupabase'

const supabase = createClient()

// Use database-generated types as source of truth
type Vendor = Tables<'vendors'>
type VendorInsert = Omit<Tables<'vendors'>, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
type VendorUpdate = Partial<Omit<Tables<'vendors'>, 'id' | 'enterprise_id' | 'created_at'>>

// Vendor with related data from joins
type VendorWithRelations = Vendor & {
  contracts?: Tables<'contracts'>[]
  vendor_performance_scores?: any[]
}

// Vendor detail with full relations
type VendorDetail = Vendor & {
  contracts: Tables<'contracts'>[]
  vendor_performance_scores: any[]
  vendor_documents?: any[]
}

interface UseVendorsOptions {
  status?: Vendor['status']
  category?: string
  limit?: number
  orderBy?: keyof Vendor
  ascending?: boolean
  realtime?: boolean
}

export function useVendors(options: UseVendorsOptions = {}) {
  const { userProfile } = useAuth()
  const [vendors, setVendors] = useState<VendorWithRelations[]>([])
  
  const buildQuery = useCallback(() => {
    let query = supabase
      .from('vendors')
      .select(`
        *,
        contracts (
          id,
          title,
          status,
          end_date
        )
      `)

    if (userProfile?.enterprise_id) {
      query = query.eq('enterprise_id', userProfile.enterprise_id)
    }

    if (options.status) {
      query = (query as any).eq('status', options.status)
    }

    if (options.category) {
      query = (query as any).eq('category', options.category)
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false })
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    return query
  }, [userProfile, options])

  // Generate cache key for request deduplication and caching
  const cacheKey = `vendors:${userProfile?.enterprise_id}:${options.status || 'all'}:${options.category || 'all'}:${options.orderBy || 'default'}:${options.ascending}:${options.limit || 'all'}`

  const { data, isLoading, error, refetch } = useSupabaseQuery(
    async () => {
      const result = await buildQuery()
      return { data: result.data, error: result.error }
    },
    {
      enabled: !!userProfile?.enterprise_id,
      cacheKey,  // Enable caching and deduplication
      staleTime: 60000,  // Vendor data can be cached longer (60s)
      refetchOnWindowFocus: false  // Don't refetch on tab switch
    }
  )

  useEffect(() => {
    if (data) {
      setVendors(data as Vendor[])
    }
  }, [data])

  // Real-time subscription
  const { isSubscribed } = useSupabaseRealtime('vendors', {
    filter: userProfile?.enterprise_id ? `enterprise_id=eq.${userProfile.enterprise_id}` : undefined,
    onInsert: (payload) => {
      if (options.realtime) {
        setVendors(prev => [...prev, payload.new as Vendor])
      }
    },
    onUpdate: (payload) => {
      if (options.realtime) {
        setVendors(prev => 
          prev.map(vendor => 
            vendor.id === payload.new.id ? payload.new as Vendor : vendor
          )
        )
      }
    },
    onDelete: (payload) => {
      if (options.realtime) {
        setVendors(prev =>
          prev.filter(vendor => vendor.id !== (payload.old as any).id)
        )
      }
    }
  })

  return {
    vendors,
    isLoading,
    error,
    refetch,
    isSubscribed: options.realtime ? isSubscribed : false
  }
}

export function useVendor(vendorId: string) {
  const { userProfile } = useAuth()

  const cacheKey = `vendor:${vendorId}:${userProfile?.enterprise_id}`

  const { data, isLoading, error, refetch } = useSupabaseQuery(
    async () => {
      const result = await supabase
        .from('vendors')
        .select(`
          *,
          contracts (
            id,
            title,
            status,
            start_date,
            end_date,
            total_value
          )
        `)
        .eq('id', vendorId)
        .eq('enterprise_id', userProfile?.enterprise_id ?? '')
        .single()

      return { data: result.data, error: result.error }
    },
    {
      enabled: !!vendorId && !!userProfile?.enterprise_id,
      cacheKey,
      staleTime: 60000,  // Single vendor can be cached longer (60s)
      refetchOnWindowFocus: false
    }
  )

  // Real-time subscription for single vendor
  useSupabaseRealtime('vendors', {
    filter: `id=eq.${vendorId}`,
    onChange: () => {
      refetch()
    }
  })

  return {
    vendor: data as VendorDetail | null,
    isLoading,
    error,
    refetch
  }
}

export function useVendorMutations() {
  const { userProfile } = useAuth()
  const mutations = useSupabaseMutation('vendors')

  const createVendor = useCallback(async (
    vendor: Omit<VendorInsert, 'enterprise_id' | 'created_by' | 'updated_by'>,
    options?: {
      onSuccess?: (data: Vendor[]) => void
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
        ...vendor,
        enterprise_id: userProfile.enterprise_id!,
        created_by: userProfile.id,
        updated_by: userProfile.id
      } as VendorInsert,
      options
    )
  }, [userProfile, mutations])

  const updateVendor = useCallback(async (
    vendorId: string,
    updates: Omit<VendorUpdate, 'updated_by' | 'updated_at'>,
    options?: {
      onSuccess?: (data: Vendor[]) => void
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
      } as VendorUpdate,
      { column: 'id', value: vendorId },
      options
    )
  }, [userProfile, mutations])

  const deleteVendor = useCallback(async (
    vendorId: string,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    return mutations.remove(
      { column: 'id', value: vendorId },
      options
    )
  }, [mutations])

  return {
    createVendor,
    updateVendor,
    deleteVendor,
    isLoading: mutations.isLoading,
    error: mutations.error
  }
}

export function useVendorPerformance(_vendorId: string) {
  // Return empty data since vendor_performance_scores table doesn't exist yet
  return {
    scores: [],
    averageScores: null,
    isLoading: false,
    error: null
  }
}

export function useVendorSearch(searchTerm: string, options: { limit?: number } = {}) {
  const { userProfile } = useAuth()
  
  const { data, isLoading, error } = useSupabaseQuery(
    async () => {
      if (!searchTerm || searchTerm.length < 2) {
        return { data: [], error: null }
      }

      const result = await (supabase as any)
        .from('vendors')
        .select(`
          id,
          name,
          primary_contact_email,
          status,
          category,
          primary_contact_name
        `)
        .eq('enterprise_id', userProfile?.enterprise_id ?? '')
        .or(`name.ilike.%${searchTerm}%,primary_contact_email.ilike.%${searchTerm}%,primary_contact_name.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })
        .limit(options.limit || 10)

      return { data: result.data, error: result.error }
    },
    {
      enabled: !!userProfile?.enterprise_id && searchTerm.length >= 2
    }
  )

  return {
    results: (data as unknown as Vendor[]) || [],
    isLoading,
    error
  }
}