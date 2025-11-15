'use client';

import { Download, CreditCard, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';
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
const formatCurrency = (amount: number) => `$${(amount / 100).toFixed(2)}`;

interface Invoice {
  _id: string;
  createdAt: number;
  periodStart: number;
  periodEnd: number;
  amount: number;
  paid: boolean;
  status: string;
  pdfUrl?: string;
}

export default function BillingSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  
  // Mock data - replace with actual API calls
  const mockUser = { enterpriseId: "mock_enterprise" };
  const enterpriseId = mockUser?.enterpriseId;
  const invoices: Invoice[] = [];
  const invoiceStats: {
    totalInvoices: number;
    totalPaid: number;
    totalPending: number;
    totalAmount: number;
  } | null = null;

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated successfully!', {
        description: 'Welcome to Pactwise! Your subscription is now active.',
      });
      // Clear the success param
      router.replace('/dashboard/settings/billing');
    }
  }, [searchParams, router]);

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

  return (
    <div className="flex-1 space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing details</p>
      </div>

      {/* Success Alert */}
      {searchParams.get('success') === 'true' && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Your subscription has been activated successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Subscription Manager */}
      <SubscriptionManager enterpriseId={enterpriseId} />

      {/* Invoice Stats */}
      {invoiceStats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(invoiceStats as any).totalInvoices}</div>
              <p className="text-xs text-muted-foreground">
                {(invoiceStats as any).totalPaid} paid, {(invoiceStats as any).totalPending} pending
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
                {formatCurrency((invoiceStats as any).totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
              {(invoiceStats as any).totalPending > 0 ? (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(invoiceStats as any).totalPending > 0 ? 'Action Required' : 'All Paid'}
              </div>
              <p className="text-xs text-muted-foreground">
                {(invoiceStats as any).totalPending > 0
                  ? `${(invoiceStats as any).totalPending} pending invoices`
                  : 'All invoices are paid'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell>
                      {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.periodStart), 'MMM d')} - {format(new Date(invoice.periodEnd), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(invoice.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={invoice.paid ? 'default' : 'secondary'}
                        className={invoice.paid ? 'bg-green-500' : ''}
                      >
                        {invoice.paid ? 'Paid' : invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.pdfUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(invoice.pdfUrl, '_blank')}
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
