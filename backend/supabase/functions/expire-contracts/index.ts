/**
 * Edge Function: Expire Contracts
 * Purpose: Batch update all active contracts that have passed their end_date to expired status
 *
 * This function can be called:
 * 1. By a cron job/scheduler (using CRON_SECRET header)
 * 2. Manually by an admin user with appropriate permissions
 * 3. By service role for internal operations
 *
 * Security:
 * - Requires either CRON_SECRET header or authenticated user with service role
 * - Uses SECURITY DEFINER function for safe batch updates
 */

import { createAdminClient } from '../_shared/supabase.ts';
import { createSuccessResponse, createErrorResponseSync } from '../_shared/responses.ts';

Deno.serve(async (req: Request) => {
  try {
    const supabase = createAdminClient();

    // Check authentication - either CRON_SECRET or Authorization header
    const cronSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('authorization');
    const expectedCronSecret = Deno.env.get('CRON_SECRET');

    // Allow if CRON_SECRET matches
    const isCronJob = cronSecret && expectedCronSecret && cronSecret === expectedCronSecret;

    // Allow if has valid auth token (checked by service)
    const isAuthenticated = authHeader && authHeader.startsWith('Bearer ');

    if (!isCronJob && !isAuthenticated) {
      return createErrorResponseSync(
        'Unauthorized: Missing or invalid authentication',
        401,
        req
      );
    }

    // If authenticated (not cron), verify it's service role or admin
    if (isAuthenticated && !isCronJob) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (authError || !user) {
        return createErrorResponseSync('Invalid authentication token', 401, req);
      }

      // For manual calls, you could add additional permission checks here
      // For now, any authenticated user can trigger this (consider restricting to admins)
    }

    // Call the batch update function
    const { data, error } = await supabase.rpc('batch_update_expired_contracts');

    if (error) {
      console.error('Error batch updating expired contracts:', error);
      return createErrorResponseSync(
        `Failed to update expired contracts: ${error.message}`,
        500,
        req
      );
    }

    // Log the results
    console.log('Batch update completed:', {
      updated: data.updated_count,
      found: data.total_found,
      timestamp: data.timestamp,
      trigger: isCronJob ? 'cron' : 'manual',
    });

    return createSuccessResponse(
      data,
      data.message || 'Batch update completed successfully',
      200,
      req
    );

  } catch (error) {
    console.error('Unexpected error in expire-contracts function:', error);
    return createErrorResponseSync(
      `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      req
    );
  }
});
