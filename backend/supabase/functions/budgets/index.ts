/// <reference path="../../types/global.d.ts" />
// Serve function is available globally in Deno runtime
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createUserClient, getUserFromAuth, extractJWT } from '../_shared/supabase.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { budgetSchema, paginationSchema, validateRequest } from '../_shared/validation.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) {return corsResponse;}

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponseSync('No authorization header', 401, req);
    }

    // Get authenticated user with profile
    const authenticatedUser = await getUserFromAuth(authHeader);
    const { profile } = authenticatedUser;

    // Create client with user's JWT for RLS
    const jwt = extractJWT(authHeader);
    const supabase = createUserClient(jwt);

    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // Get user's permissions for budgets
    const permissions = await getUserPermissions(supabase, profile, 'budgets');

    // Route handling
    if (method === 'GET' && pathname === '/budgets') {
      // List budgets with pagination and filtering
      const params = Object.fromEntries(url.searchParams);
      const { page = 1, limit = 20, sortBy, sortOrder } = validateRequest(paginationSchema, params);

      const offset = (page - 1) * limit;

      let query = supabase
        .from('budgets')
        .select(`
          *,
          owner:users!owner_id(id, first_name, last_name, email),
          parent_budget:budgets!parent_budget_id(id, name),
          allocations:budget_allocations(
            id,
            contract:contracts(id, title, value),
            amount,
            allocated_at
          )
        `, { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .is('deleted_at', null)
        .range(offset, offset + limit - 1);

      // Apply filters
      if (params.budgetType) {
        query = query.eq('budget_type', params.budgetType);
      }
      if (params.department) {
        query = query.eq('department', params.department);
      }
      if (params.ownerId) {
        query = query.eq('owner_id', params.ownerId);
      }
      if (params.search) {
        query = query.ilike('name', `%${params.search}%`);
      }
      if (params.startDate) {
        query = query.gte('end_date', params.startDate);
      }
      if (params.endDate) {
        query = query.lte('start_date', params.endDate);
      }

      // Apply sorting
      const orderColumn = sortBy || 'created_at';
      query = query.order(orderColumn, { ascending: sortOrder === 'asc' });

      const { data, error, count } = await query;

      if (error) {throw error;}

      // Calculate budget utilization
      const budgetsWithUtilization = data.map((budget: any) => {
        const allocatedAmount = budget.allocations?.reduce((sum: number, alloc: any) => sum + (alloc.amount || 0), 0) || 0;
        const remainingBudget = budget.total_budget - allocatedAmount;
        const utilizationPercentage = (allocatedAmount / budget.total_budget) * 100;

        return {
          ...budget,
          allocated_amount: allocatedAmount,
          remaining_budget: remainingBudget,
          utilization_percentage: utilizationPercentage,
        };
      });

      return createSuccessResponse({
        data: budgetsWithUtilization,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }, 'Budgets retrieved successfully', 200, req);
    }

    if (method === 'POST' && pathname === '/budgets') {
      // Check create permission
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      // Create new budget
      const body = await req.json();
      const validatedData = validateRequest(budgetSchema, body);

      // Validate date range
      if (new Date(validatedData.startDate) >= new Date(validatedData.endDate)) {
        return new Response(
          JSON.stringify({ error: 'End date must be after start date' }),
          {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 400,
          },
        );
      }

      // If parent budget is specified, validate it exists and has sufficient funds
      if (validatedData.parentBudgetId) {
        const { data: parentBudget } = await supabase
          .from('budgets')
          .select('id, total_budget')
          .eq('id', validatedData.parentBudgetId)
          .eq('enterprise_id', profile.enterprise_id)
          .single();

        if (!parentBudget) {
          return new Response(
            JSON.stringify({ error: 'Parent budget not found' }),
            {
              headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
              status: 404,
            },
          );
        }

        // Check if parent has enough unallocated budget
        const { data: siblingBudgets } = await supabase
          .from('budgets')
          .select('total_budget')
          .eq('parent_budget_id', validatedData.parentBudgetId)
          .is('deleted_at', null);

        const allocatedToSiblings = siblingBudgets?.reduce((sum, b) => sum + b.total_budget, 0) || 0;
        const availableInParent = parentBudget.total_budget - allocatedToSiblings;

        if (validatedData.totalBudget > availableInParent) {
          return createErrorResponseSync('Insufficient budget in parent', 400, req, {
            available: availableInParent,
          });
        }
      }

      // Create budget
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          ...validatedData,
          enterprise_id: profile.enterprise_id,
          created_by: profile.id,
          owner_id: validatedData.ownerId || profile.id,
        })
        .select()
        .single();

      if (error) {throw error;}

      return createSuccessResponse(data, 'Budget created successfully', 201, req);
    }

    if (method === 'GET' && pathname.match(/^\/budgets\/[a-f0-9-]+$/)) {
      // Get single budget with full details
      const budgetId = pathname.split('/')[2];

      const { data: budget, error } = await supabase
        .from('budgets')
        .select(`
          *,
          owner:users!owner_id(id, first_name, last_name, email),
          created_by_user:users!created_by(id, first_name, last_name, email),
          parent_budget:budgets!parent_budget_id(id, name),
          child_budgets:budgets!parent_budget_id(id, name, total_budget),
          allocations:budget_allocations(
            id,
            contract:contracts(id, title, value, status, vendor:vendors(name)),
            amount,
            allocated_at,
            allocated_by_user:users!allocated_by(first_name, last_name)
          )
        `)
        .eq('id', budgetId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error) {throw error;}
      if (!budget) {
        return createErrorResponseSync('Budget not found', 404, req);
      }

      // Calculate detailed analytics
      const allocatedAmount = budget.allocations?.reduce((sum: number, alloc: any) => sum + (alloc.amount || 0), 0) || 0;
      const childBudgetsTotal = budget.child_budgets?.reduce((sum: number, child: any) => sum + child.total_budget, 0) || 0;
      const remainingBudget = budget.total_budget - allocatedAmount - childBudgetsTotal;
      const utilizationPercentage = ((allocatedAmount + childBudgetsTotal) / budget.total_budget) * 100;

      // Group allocations by contract status
      const allocationsByStatus = budget.allocations?.reduce((acc: any, alloc: any) => {
        const status = alloc.contract?.status || 'unknown';
        if (!acc[status]) {acc[status] = { count: 0, amount: 0 };}
        acc[status].count++;
        acc[status].amount += alloc.amount || 0;
        return acc;
      }, {});

      return new Response(
        JSON.stringify({
          ...budget,
          analytics: {
            allocated_amount: allocatedAmount,
            child_budgets_total: childBudgetsTotal,
            remaining_budget: remainingBudget,
            utilization_percentage: utilizationPercentage,
            allocations_by_status: allocationsByStatus,
            total_allocations: budget.allocations?.length || 0,
            total_child_budgets: budget.child_budgets?.length || 0,
          },
        }),
        {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    if (method === 'PUT' && pathname.match(/^\/budgets\/[a-f0-9-]+$/)) {
      // Update budget
      const budgetId = pathname.split('/')[2];

      // Check update permission
      if (!permissions.canUpdate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const body = await req.json();

      // Validate update data
      const updateData: any = {};
      if (body.name !== undefined) {updateData.name = body.name;}
      if (body.totalBudget !== undefined) {updateData.total_budget = body.totalBudget;}
      if (body.department !== undefined) {updateData.department = body.department;}
      if (body.ownerId !== undefined) {updateData.owner_id = body.ownerId;}
      if (body.metadata !== undefined) {updateData.metadata = body.metadata;}

      // If updating total budget, ensure it's not less than allocated amount
      if (updateData.total_budget !== undefined) {
        const { data: currentBudget } = await supabase
          .from('budgets')
          .select(`
            allocations:budget_allocations(amount),
            child_budgets:budgets!parent_budget_id(total_budget)
          `)
          .eq('id', budgetId)
          .single();

        const allocatedAmount = currentBudget?.allocations?.reduce((sum, a) => sum + a.amount, 0) || 0;
        const childBudgetsTotal = currentBudget?.child_budgets?.reduce((sum, b) => sum + b.total_budget, 0) || 0;
        const totalCommitted = allocatedAmount + childBudgetsTotal;

        if (updateData.total_budget < totalCommitted) {
          return new Response(
            JSON.stringify({
              error: 'Cannot reduce budget below allocated amount',
              allocated: totalCommitted,
              requested: updateData.total_budget,
            }),
            {
              headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
              status: 400,
            },
          );
        }
      }

      const { data, error } = await supabase
        .from('budgets')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', budgetId)
        .eq('enterprise_id', profile.enterprise_id)
        .select()
        .single();

      if (error) {throw error;}
      if (!data) {
        return createErrorResponseSync('Budget not found', 404, req);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (method === 'POST' && pathname.match(/^\/budgets\/[a-f0-9-]+\/allocate$/)) {
      // Allocate budget to contract
      const budgetId = pathname.split('/')[2];
      const { contractId, amount } = await req.json();

      if (!contractId || !amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Valid contract ID and positive amount required' }),
          {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 400,
          },
        );
      }

      // Check budget exists and user has access
      const { data: budget } = await supabase
        .from('budgets')
        .select('id, total_budget')
        .eq('id', budgetId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!budget) {
        return createErrorResponseSync('Budget not found', 404, req);
      }

      // Check contract exists
      const { data: contract } = await supabase
        .from('contracts')
        .select('id, title')
        .eq('id', contractId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!contract) {
        return createErrorResponseSync('Contract not found', 404, req);
      }

      // Check available budget
      const { data: existingAllocations } = await supabase
        .from('budget_allocations')
        .select('amount')
        .eq('budget_id', budgetId);

      const { data: childBudgets } = await supabase
        .from('budgets')
        .select('total_budget')
        .eq('parent_budget_id', budgetId)
        .is('deleted_at', null);

      const allocatedAmount = existingAllocations?.reduce((sum, a) => sum + a.amount, 0) || 0;
      const childBudgetsTotal = childBudgets?.reduce((sum, b) => sum + b.total_budget, 0) || 0;
      const availableBudget = budget.total_budget - allocatedAmount - childBudgetsTotal;

      if (amount > availableBudget) {
        return new Response(
          JSON.stringify({
            error: 'Insufficient budget available',
            available: availableBudget,
            requested: amount,
          }),
          {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 400,
          },
        );
      }

      // Create allocation
      const { data: allocation, error } = await supabase
        .from('budget_allocations')
        .insert({
          budget_id: budgetId,
          contract_id: contractId,
          amount,
          allocated_by: profile.id,
          allocated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {throw error;}

      return new Response(JSON.stringify(allocation), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    if (method === 'DELETE' && pathname.match(/^\/budgets\/[a-f0-9-]+$/)) {
      // Soft delete budget
      const budgetId = pathname.split('/')[2];

      // Check delete permission
      if (!permissions.canDelete) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      // Check if budget has allocations or child budgets
      const { data: budget } = await supabase
        .from('budgets')
        .select(`
          allocations:budget_allocations(id),
          child_budgets:budgets!parent_budget_id(id)
        `)
        .eq('id', budgetId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!budget) {
        return createErrorResponseSync('Budget not found', 404, req);
      }

      if (budget.allocations?.length > 0 || budget.child_budgets?.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'Cannot delete budget with allocations or child budgets',
            allocations: budget.allocations?.length || 0,
            childBudgets: budget.child_budgets?.length || 0,
          }),
          {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 400,
          },
        );
      }

      // Soft delete
      const { error } = await supabase
        .from('budgets')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
        })
        .eq('id', budgetId)
        .eq('enterprise_id', profile.enterprise_id);

      if (error) {throw error;}

      return new Response(null, {
        headers: getCorsHeaders(req),
        status: 204,
      });
    }

    // Method not allowed
    return createErrorResponseSync('Method not allowed', 405, req);

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});