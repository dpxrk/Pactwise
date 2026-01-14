import { useCallback } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/utils/supabase/client'
import { Tables } from '@/types/database.types'

import { useSupabaseQuery, useSupabaseMutation } from './useSupabase'

const supabase = createClient()

type Department = Tables<'departments'>
type DepartmentInsert = Omit<Tables<'departments'>, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
type DepartmentUpdate = Partial<Omit<Tables<'departments'>, 'id' | 'enterprise_id' | 'created_at'>>

export function useDepartments() {
  const { userProfile } = useAuth()
  
  const { data, isLoading, error, refetch } = useSupabaseQuery(
    async () => {
      const result = await supabase
        .from('departments')
        .select(`
          *,
          users:users(count),
          contracts:contracts(count),
          budgets:budgets(
            id,
            total_budget,
            spent_amount
          )
        `)
        .eq('enterprise_id', userProfile!.enterprise_id!)
        .order('name', { ascending: true })
      
      return { data: result.data, error: result.error }
    },
    {
      enabled: !!userProfile?.enterprise_id
    }
  )

  return {
    departments: (data as unknown as (Department & {
      users: { count: number }[]
      contracts: { count: number }[]
      budgets: any[]
    })[]) || [],
    isLoading,
    error,
    refetch
  }
}

export function useDepartment(departmentId: string) {
  const { userProfile } = useAuth()
  
  const { data, isLoading, error, refetch } = useSupabaseQuery(
    async () => {
      const result = await supabase
        .from('departments')
        .select(`
          *,
          users:users(
            id,
            first_name,
            last_name,
            email,
            role
          ),
          contracts:contracts(
            id,
            title,
            status,
            value
          ),
          budgets:budgets(
            id,
            budget_type,
            total_budget,
            spent_amount
          )
        `)
        .eq('id', departmentId)
        .eq('enterprise_id', userProfile!.enterprise_id!)
        .single()
      
      return { data: result.data, error: result.error }
    },
    {
      enabled: !!departmentId && !!userProfile?.enterprise_id
    }
  )

  return {
    department: data as (Department & {
      users: Tables<'users'>[]
      contracts: Tables<'contracts'>[]
      budgets: any[]
    }) | null,
    isLoading,
    error,
    refetch
  }
}

export function useDepartmentMutations() {
  const { userProfile } = useAuth()
  const mutations = useSupabaseMutation('departments')

  const createDepartment = useCallback(async (
    department: Omit<DepartmentInsert, 'enterprise_id' | 'created_by' | 'updated_by'>,
    options?: {
      onSuccess?: (data: Department[]) => void
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
        ...department,
        enterprise_id: userProfile.enterprise_id!,
        created_by: userProfile.id,
        updated_by: userProfile.id
      } as DepartmentInsert,
      options
    )
  }, [userProfile, mutations])

  const updateDepartment = useCallback(async (
    departmentId: string,
    updates: Omit<DepartmentUpdate, 'updated_by' | 'updated_at'>,
    options?: {
      onSuccess?: (data: Department[]) => void
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
      } as DepartmentUpdate,
      { column: 'id', value: departmentId },
      options
    )
  }, [userProfile, mutations])

  const deleteDepartment = useCallback(async (
    departmentId: string,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    return mutations.remove(
      { column: 'id', value: departmentId },
      options
    )
  }, [mutations])

  return {
    createDepartment,
    updateDepartment,
    deleteDepartment,
    isLoading: mutations.isLoading,
    error: mutations.error
  }
}

export function useDepartmentStats(departmentId?: string) {
  const { userProfile } = useAuth()
  
  const { data, isLoading, error } = useSupabaseQuery(
    async () => {
      let contractQuery = supabase
        .from('contracts')
        .select('id, status, value', { count: 'exact' })
        .eq('enterprise_id', userProfile!.enterprise_id!)

      let budgetQuery = supabase
        .from('budgets')
        .select('id, total_budget, spent_amount')
        .eq('enterprise_id', userProfile!.enterprise_id!)

      if (departmentId) {
        contractQuery = contractQuery.eq('department_id', departmentId)
        budgetQuery = budgetQuery.eq('department_id', departmentId)
      }

      const [contractsResult, budgetsResult] = await Promise.all([
        contractQuery,
        budgetQuery
      ])

      if (contractsResult.error || budgetsResult.error) {
        throw contractsResult.error || budgetsResult.error
      }

      const contracts = contractsResult.data || []
      const budgets = budgetsResult.data || []

      const stats = {
        totalContracts: contracts.length,
        activeContracts: contracts.filter((c: any) => c.status === 'active').length,
        totalContractValue: contracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0),
        totalBudget: budgets.reduce((sum: number, b: any) => sum + (b.total_budget || 0), 0),
        totalSpent: budgets.reduce((sum: number, b: any) => sum + (b.spent_amount || 0), 0),
        totalRemaining: budgets.reduce((sum: number, b: any) => sum + ((b.total_budget || 0) - (b.spent_amount || 0)), 0),
      }

      return { data: stats, error: null }
    },
    {
      enabled: !!userProfile?.enterprise_id
    }
  )

  return {
    stats: data || {
      totalContracts: 0,
      activeContracts: 0,
      totalContractValue: 0,
      totalBudget: 0,
      totalSpent: 0,
      totalRemaining: 0
    },
    isLoading,
    error
  }
}