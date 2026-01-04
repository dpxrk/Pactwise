/**
 * Stripe Invoices - Supabase Edge Function
 *
 * Retrieves invoice history and statistics.
 *
 * GET /stripe-invoices
 * Query: ?limit=10&offset=0
 * Returns: { invoices: Invoice[], stats: InvoiceStats, pagination: Pagination }
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

// Initialize Supabase Admin Client
function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

// Extract and verify JWT
async function getAuthenticatedUser(authHeader: string | null, supabase: ReturnType<typeof getSupabaseAdmin>) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const jwt = authHeader.replace('Bearer ', '');
  const { data: authUser, error: authError } = await supabase.auth.getUser(jwt);

  if (authError || !authUser?.user) {
    throw new Error('Invalid or expired token');
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, enterprise_id, role')
    .eq('auth_id', authUser.user.id)
    .eq('is_active', true)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile not found');
  }

  return {
    auth: authUser.user,
    profile,
  };
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

interface InvoiceStats {
  totalInvoices: number;
  totalPaid: number;
  totalPending: number;
  totalAmount: number;
  paidAmount: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    const user = await getAuthenticatedUser(authHeader, supabase);
    const enterpriseId = user.profile.enterprise_id;

    // Parse query parameters
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status'); // optional filter

    // Build query
    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('enterprise_id', enterpriseId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: invoices, error: invoicesError, count } = await query;

    if (invoicesError) {
      throw new Error('Failed to fetch invoices');
    }

    // Calculate stats
    const { data: statsData } = await supabase
      .from('invoices')
      .select('status, amount_due, amount_paid')
      .eq('enterprise_id', enterpriseId);

    const stats: InvoiceStats = {
      totalInvoices: count || 0,
      totalPaid: 0,
      totalPending: 0,
      totalAmount: 0,
      paidAmount: 0,
    };

    if (statsData) {
      for (const invoice of statsData) {
        stats.totalAmount += invoice.amount_due || 0;
        stats.paidAmount += invoice.amount_paid || 0;

        if (invoice.status === 'paid') {
          stats.totalPaid++;
        } else if (invoice.status === 'open') {
          stats.totalPending++;
        }
      }
    }

    // Format invoices for response
    const formattedInvoices = (invoices || []).map(inv => ({
      id: inv.id,
      stripeInvoiceId: inv.stripe_invoice_id,
      invoiceNumber: inv.invoice_number,
      status: inv.status,
      amountDue: inv.amount_due,
      amountPaid: inv.amount_paid,
      amountRemaining: inv.amount_remaining,
      currency: inv.currency,
      periodStart: inv.period_start,
      periodEnd: inv.period_end,
      dueDate: inv.due_date,
      paidAt: inv.paid_at,
      invoicePdf: inv.invoice_pdf,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      createdAt: inv.created_at,
    }));

    return new Response(
      JSON.stringify({
        invoices: formattedInvoices,
        stats,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (offset + limit) < (count || 0),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const err = error as Error;
    console.error('❌ Invoices error:', err);

    let status = 500;
    if (err.message.includes('authorization') || err.message.includes('token')) {
      status = 401;
    } else if (err.message.includes('not found')) {
      status = 404;
    }

    return new Response(
      JSON.stringify({
        error: err.message || 'Failed to fetch invoices',
      }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
