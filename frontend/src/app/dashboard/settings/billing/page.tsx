'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
// import { useQuery } from 'convex/react';
// import { api } from '../../../../../convex/_generated/api';
import { SubscriptionManager } from '@/components/stripe/SubscriptionManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Download, CreditCard, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from '@/lib/date';
// import { formatCurrency } from '../../../../../convex/stripe/config';
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
  const invoiceStats = null;

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

  if (!isSignedIn) {
    router.push('/sign-in');
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
                {formatCurrency(invoiceStats.totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
              {invoiceStats.totalPending > 0 ? (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
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
                      {format(invoice.createdAt, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {format(invoice.periodStart, 'MMM d')} - {format(invoice.periodEnd, 'MMM d, yyyy')}
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
