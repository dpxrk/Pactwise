import { useCallback } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/utils/supabase/client'
import { Tables } from '@/types/database.types'

import { useSupabaseQuery, useSupabaseRealtime, useSupabaseMutation } from './useSupabase'

const supabase = createClient()

// Manual type definitions for budget-related tables (not in generated types)
interface Budget {
  id: string
  enterprise_id: string
  department_id: string
  fiscal_year: string
  total_amount: number
  spent_amount: number
  remaining_amount: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

interface BudgetInsert extends Omit<Budget, 'id' | 'created_at' | 'updated_at'> {}
interface BudgetUpdate extends Partial<Omit<Budget, 'id' | 'created_at'>> {}

interface BudgetAllocation {
  id: string
  budget_id: string
  category: string
  allocated_amount: number
  spent_amount: number
  remaining_amount: number
  notes?: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

interface BudgetTransaction {
  id: string
  budget_id: string
  transaction_type: string
  amount: number
  description: string
  transaction_date: string
  created_by: string
  created_at: string
  updated_at: string
}

interface UseBudgetsOptions {
  departmentId?: string
  fiscalYear?: string
  realtime?: boolean
}

export function useBudgets(options: UseBudgetsOptions = {}) {
  const { userProfile } = useAuth()
  
  const buildQuery = useCallback(() => {
    let query = supabase
      .from('budgets')
      .select(`
        *,
        departments (
          id,
          name
        ),
        budget_allocations (
          id,
          category,
          allocated_amount,
          spent_amount,
          remaining_amount
        )
      `)

    if (userProfile?.enterprise_id) {
      query = query.eq('enterprise_id', userProfile.enterprise_id)
    }

    if (options.departmentId) {
      query = query.eq('department_id', options.departmentId)
    }

    if (options.fiscalYear) {
      query = query.eq('fiscal_year', options.fiscalYear)
    }

    return query.order('created_at', { ascending: false })
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

  // Real-time subscription
  useSupabaseRealtime('budgets' as any, {
    filter: userProfile?.enterprise_id ? `enterprise_id=eq.${userProfile.enterprise_id}` : undefined,
    onChange: () => {
      if (options.realtime) {
        refetch()
      }
    }
  })

  return {
    budgets: data as (Budget & {
      departments: Tables<'departments'>
      budget_allocations: BudgetAllocation[]
    })[] || [],
    isLoading,
    error,
    refetch
  }
}

export function useBudget(budgetId: string) {
  const { userProfile } = useAuth()
  
  const { data, isLoading, error, refetch } = useSupabaseQuery(
    async () => {
      const result = await supabase
        .from('budgets')
        .select(`
          *,
          departments (
            id,
            name,
            description
          ),
          budget_allocations (
            id,
            category,
            allocated_amount,
            spent_amount,
            remaining_amount,
            notes
          ),
          budget_transactions (
            id,
            transaction_type,
            amount,
            description,
            transaction_date,
            created_by,
            users (
              full_name,
              email
            )
          )
        `)
        .eq('id', budgetId)
        .eq('enterprise_id', userProfile?.enterprise_id ?? '')
        .single()
      
      return { data: result.data, error: result.error }
    },
    {
      enabled: !!budgetId && !!userProfile?.enterprise_id
    }
  )

  // Real-time subscription for single budget
  useSupabaseRealtime('budgets' as any, {
    filter: `id=eq.${budgetId}`,
    onChange: () => {
      refetch()
    }
  })

  // Also subscribe to budget allocations changes
  useSupabaseRealtime('budget_allocations' as any, {
    filter: `budget_id=eq.${budgetId}`,
    onChange: () => {
      refetch()
    }
  })

  return {
    budget: data as (Budget & {
      departments: Tables<'departments'>
      budget_allocations: BudgetAllocation[]
      budget_transactions: (BudgetTransaction & {
        users: Pick<Tables<'users'>, 'full_name' | 'email'>
      })[]
    }) | null,
    isLoading,
    error,
    refetch
  }
}

export function useBudgetMutations() {
  const { userProfile } = useAuth()
  const budgetMutations = useSupabaseMutation('budgets' as any)
  const allocationMutations = useSupabaseMutation('budget_allocations' as any)

  const createBudget = useCallback(async (
    budget: Omit<BudgetInsert, 'enterprise_id' | 'created_by' | 'updated_by'>,
    allocations?: Omit<BudgetAllocation, 'id' | 'budget_id' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'>[],
    options?: {
      onSuccess?: (data: Budget[]) => void
      onError?: (error: Error) => void
    }
  ) => {
    if (!userProfile) {
      const error = new Error('User not authenticated')
      options?.onError?.(error)
      return { data: null, error }
    }

    try {
      // Create budget
      const budgetResult = await budgetMutations.insert(
        {
          ...budget,
          enterprise_id: userProfile.enterprise_id!,
          created_by: userProfile.id,
          updated_by: userProfile.id
        } as BudgetInsert
      )

      if (budgetResult.error) throw budgetResult.error

      // Create allocations if provided
      if (allocations && allocations.length > 0 && budgetResult.data?.[0]) {
        const budgetId = budgetResult.data[0].id
        
        await Promise.all(
          allocations.map(allocation =>
            allocationMutations.insert({
              ...allocation,
              budget_id: budgetId,
              created_by: userProfile.id,
              updated_by: userProfile.id
            } as any)
          )
        )
      }

      options?.onSuccess?.(budgetResult.data!)
      return { data: budgetResult.data, error: null }
    } catch (err) {
      const error = err as Error
      options?.onError?.(error)
      return { data: null, error }
    }
  }, [userProfile, budgetMutations, allocationMutations])

  const updateBudget = useCallback(async (
    budgetId: string,
    updates: Omit<BudgetUpdate, 'updated_by' | 'updated_at'>,
    options?: {
      onSuccess?: (data: Budget[]) => void
      onError?: (error: Error) => void
    }
  ) => {
    if (!userProfile) {
      const error = new Error('User not authenticated')
      options?.onError?.(error)
      return { data: null, error }
    }

    return budgetMutations.update(
      {
        ...updates,
        updated_by: userProfile.id,
        updated_at: new Date().toISOString()
      } as BudgetUpdate,
      { column: 'id', value: budgetId },
      options
    )
  }, [userProfile, budgetMutations])

  const deleteBudget = useCallback(async (
    budgetId: string,
    options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }
  ) => {
    return budgetMutations.remove(
      { column: 'id', value: budgetId },
      options
    )
  }, [budgetMutations])

  return {
    createBudget,
    updateBudget,
    deleteBudget,
    isLoading: budgetMutations.isLoading || allocationMutations.isLoading,
    error: budgetMutations.error || allocationMutations.error
  }
}

interface BudgetWithDepartment {
  id: string;
  department_id: string | null;
  fiscal_year: string;
  total_amount: number | null;
  spent_amount: number | null;
  remaining_amount: number | null;
  departments: { name: string } | null;
}

export function useBudgetAnalytics() {
  const { userProfile } = useAuth()

  const { data, isLoading, error } = useSupabaseQuery(
    async () => {
      // Get all budgets for the enterprise
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: budgets, error: budgetsError } = await (supabase as any)
        .from('budgets')
        .select(`
          id,
          department_id,
          fiscal_year,
          total_amount,
          spent_amount,
          remaining_amount,
          departments (name)
        `)
        .eq('enterprise_id', userProfile?.enterprise_id ?? '') as { data: BudgetWithDepartment[] | null; error: Error | null };

      if (budgetsError) throw budgetsError

      // Get budget allocations
      const budgetIds = budgets?.map(b => b.id) || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allocations, error: allocationsError } = await (supabase as any)
        .from('budget_allocations')
        .select('*')
        .in('budget_id', budgetIds) as { data: Array<{ category?: string; allocated_amount?: number; spent_amount?: number; remaining_amount?: number }> | null; error: Error | null };

      if (allocationsError) throw allocationsError

      // Calculate analytics
      const currentYear = new Date().getFullYear().toString()
      const currentYearBudgets = budgets?.filter(b => b.fiscal_year === currentYear) || []
      
      const analytics = {
        totalBudget: currentYearBudgets.reduce((sum, b) => sum + (b.total_amount || 0), 0),
        totalSpent: currentYearBudgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0),
        totalRemaining: currentYearBudgets.reduce((sum, b) => sum + (b.remaining_amount || 0), 0),
        utilizationRate: 0,
        departmentBreakdown: {} as Record<string, {
          budget: number
          spent: number
          remaining: number
        }>,
        categoryBreakdown: {} as Record<string, {
          allocated: number
          spent: number
          remaining: number
        }>,
        yearOverYear: {} as Record<string, {
          budget: number
          spent: number
        }>
      }

      // Calculate utilization rate
      if (analytics.totalBudget > 0) {
        analytics.utilizationRate = (analytics.totalSpent / analytics.totalBudget) * 100
      }

      // Department breakdown
      currentYearBudgets.forEach(budget => {
        const deptName = (budget as any).departments?.name || 'Unknown'
        if (!analytics.departmentBreakdown[deptName]) {
          analytics.departmentBreakdown[deptName] = {
            budget: 0,
            spent: 0,
            remaining: 0
          }
        }
        analytics.departmentBreakdown[deptName].budget += budget.total_amount || 0
        analytics.departmentBreakdown[deptName].spent += budget.spent_amount || 0
        analytics.departmentBreakdown[deptName].remaining += budget.remaining_amount || 0
      })

      // Category breakdown
      allocations?.forEach(allocation => {
        const category = allocation.category || 'Uncategorized'
        if (!analytics.categoryBreakdown[category]) {
          analytics.categoryBreakdown[category] = {
            allocated: 0,
            spent: 0,
            remaining: 0
          }
        }
        analytics.categoryBreakdown[category].allocated += allocation.allocated_amount || 0
        analytics.categoryBreakdown[category].spent += allocation.spent_amount || 0
        analytics.categoryBreakdown[category].remaining += allocation.remaining_amount || 0
      })

      // Year over year comparison
      budgets?.forEach(budget => {
        const year = budget.fiscal_year || 'Unknown'
        if (!analytics.yearOverYear[year]) {
          analytics.yearOverYear[year] = {
            budget: 0,
            spent: 0
          }
        }
        analytics.yearOverYear[year].budget += budget.total_amount || 0
        analytics.yearOverYear[year].spent += budget.spent_amount || 0
      })

      return { data: analytics, error: null }
    },
    {
      enabled: !!userProfile?.enterprise_id
    }
  )

  return {
    analytics: data || {
      totalBudget: 0,
      totalSpent: 0,
      totalRemaining: 0,
      utilizationRate: 0,
      departmentBreakdown: {},
      categoryBreakdown: {},
      yearOverYear: {}
    },
    isLoading,
    error
  }
}