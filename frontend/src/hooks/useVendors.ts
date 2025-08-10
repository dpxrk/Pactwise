import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabaseQuery, useSupabaseRealtime, useSupabaseMutation } from './useSupabase'
import { Tables } from '@/types/database.types'
import { useAuth } from '@/contexts/AuthContext'

type Vendor = Tables<'vendors'>
type VendorInsert = Tables<'vendors'>['Insert']
type VendorUpdate = Tables<'vendors'>['Update']

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
  const [vendors, setVendors] = useState<Vendor[]>([])
  
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
        ),
        vendor_performance_scores (
          quality_score,
          delivery_score,
          compliance_score,
          overall_score,
          evaluated_at
        )
      `)

    if (userProfile?.enterprise_id) {
      query = query.eq('enterprise_id', userProfile.enterprise_id)
    }

    if (options.status) {
      query = query.eq('status', options.status)
    }

    if (options.category) {
      query = query.eq('category', options.category)
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
          prev.filter(vendor => vendor.id !== payload.old.id)
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
          ),
          vendor_performance_scores (
            id,
            quality_score,
            delivery_score,
            compliance_score,
            overall_score,
            evaluated_at,
            notes
          ),
          vendor_documents (
            id,
            document_type,
            file_name,
            file_path,
            uploaded_at
          )
        `)
        .eq('id', vendorId)
        .eq('enterprise_id', userProfile?.enterprise_id)
        .single()
      
      return { data: result.data, error: result.error }
    },
    {
      enabled: !!vendorId && !!userProfile?.enterprise_id
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
    vendor: data as (Vendor & {
      contracts: Tables<'contracts'>[]
      vendor_performance_scores: Tables<'vendor_performance_scores'>[]
      vendor_documents: Tables<'vendor_documents'>[]
    }) | null,
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

export function useVendorPerformance(vendorId: string) {
  const { userProfile } = useAuth()
  
  const { data, isLoading, error } = useSupabaseQuery(
    async () => {
      const result = await supabase
        .from('vendor_performance_scores')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('evaluated_at', { ascending: false })
        .limit(12) // Last 12 evaluations
      
      return { data: result.data, error: result.error }
    },
    {
      enabled: !!vendorId && !!userProfile?.enterprise_id
    }
  )

  const averageScores = data ? {
    quality: data.reduce((acc, score) => acc + (score.quality_score || 0), 0) / data.length,
    delivery: data.reduce((acc, score) => acc + (score.delivery_score || 0), 0) / data.length,
    compliance: data.reduce((acc, score) => acc + (score.compliance_score || 0), 0) / data.length,
    overall: data.reduce((acc, score) => acc + (score.overall_score || 0), 0) / data.length,
  } : null

  return {
    scores: data as Tables<'vendor_performance_scores'>[] || [],
    averageScores,
    isLoading,
    error
  }
}

export function useVendorSearch(searchTerm: string, options: { limit?: number } = {}) {
  const { userProfile } = useAuth()
  
  const { data, isLoading, error } = useSupabaseQuery(
    async () => {
      if (!searchTerm || searchTerm.length < 2) {
        return { data: [], error: null }
      }

      const result = await supabase
        .from('vendors')
        .select(`
          id,
          name,
          email,
          status,
          category,
          contact_person
        `)
        .eq('enterprise_id', userProfile?.enterprise_id)
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })
        .limit(options.limit || 10)
      
      return { data: result.data, error: result.error }
    },
    {
      enabled: !!userProfile?.enterprise_id && searchTerm.length >= 2
    }
  )

  return {
    results: data as Vendor[] || [],
    isLoading,
    error
  }
}