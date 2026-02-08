'use client';

import { Download, CreditCard, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { SubscriptionManager } from '@/components/stripe/SubscriptionManager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { format } from '@/lib/date';
import { createClient } from '@/utils/supabase/client';

const formatCurrency = (amount: number, currency = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

interface Invoice {
  id: string;
  stripeInvoiceId: string;
  invoiceNumber: string | null;
  status: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  paidAt: string | null;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: string;
}

interface InvoiceStats {
  totalInvoices: number;
  totalPaid: number;
  totalPending: number;
  totalAmount: number;
  paidAmount: number;
}

interface InvoiceData {
  invoices: Invoice[];
  stats: InvoiceStats;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function BillingSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);

  // Fetch enterprise ID for the user
  useEffect(() => {
    async function fetchEnterpriseId() {
      if (!user) return;

      const supabase = createClient();
      const { data: profile } = await supabase
        .from('users')
        .select('enterprise_id')
        .eq('auth_id', user.id)
        .single();

      if (profile?.enterprise_id) {
        setEnterpriseId(profile.enterprise_id);
      }
    }

    fetchEnterpriseId();
  }, [user]);

  // Fetch invoice data
  const fetchInvoices = useCallback(async () => {
    if (!enterpriseId) return;

    setIsLoadingInvoices(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsLoadingInvoices(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-invoices?limit=20`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data: InvoiceData = await response.json();
        setInvoiceData(data);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setIsLoadingInvoices(false);
    }
  }, [enterpriseId]);

  useEffect(() => {
    if (enterpriseId) {
      fetchInvoices();
    }
  }, [enterpriseId, fetchInvoices]);

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated successfully!', {
        description: 'Welcome to Pactwise! Your subscription is now active.',
      });
      // Clear the success param
      router.replace('/dashboard/settings/billing');
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout canceled', {
        description: 'No changes were made to your subscription.',
      });
      router.replace('/dashboard/settings/billing');
    }
  }, [searchParams, router]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/auth/sign-in');
    return null;
  }

  if (!user || !enterpriseId) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const invoiceStats = invoiceData?.stats;
  const invoices = invoiceData?.invoices || [];

  return (
    <div className="flex-1 space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing details</p>
      </div>

      {/* Success Alert */}
      {searchParams.get('success') === 'true' && (
        <Alert className="border-success-500 bg-success-50 dark:bg-success-950">
          <CheckCircle className="h-4 w-4 text-success-600" />
          <AlertDescription className="text-success-800 dark:text-success-200">
            Your subscription has been activated successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Subscription Manager */}
      <SubscriptionManager enterpriseId={enterpriseId} />

      {/* Invoice Stats */}
      {invoiceStats && invoiceStats.totalInvoices > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoiceStats.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {invoiceStats.totalPaid} paid, {invoiceStats.totalPending} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(invoiceStats.paidAmount)}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
              {invoiceStats.totalPending > 0 ? (
                <AlertCircle className="h-4 w-4 text-warning-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-success-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {invoiceStats.totalPending > 0 ? 'Action Required' : 'All Paid'}
              </div>
              <p className="text-xs text-muted-foreground">
                {invoiceStats.totalPending > 0
                  ? `${invoiceStats.totalPending} pending invoices`
                  : 'All invoices are paid'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoice History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>
              View and download your past invoices
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchInvoices}
            disabled={isLoadingInvoices}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingInvoices ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingInvoices ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {invoice.invoiceNumber || '-'}
                    </TableCell>
                    <TableCell>
                      {invoice.periodStart && invoice.periodEnd ? (
                        <>
                          {format(new Date(invoice.periodStart), 'MMM d')} -{' '}
                          {format(new Date(invoice.periodEnd), 'MMM d, yyyy')}
                        </>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(invoice.amountDue, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                        className={invoice.status === 'paid' ? 'bg-success-500' : ''}
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {invoice.hostedInvoiceUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(invoice.hostedInvoiceUrl!, '_blank')}
                          title="View invoice"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      {invoice.invoicePdf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(invoice.invoicePdf!, '_blank')}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No invoices yet. Start your subscription to see invoices here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
