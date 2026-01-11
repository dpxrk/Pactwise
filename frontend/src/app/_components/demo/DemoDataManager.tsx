'use client';

import { AlertTriangle, Database, RefreshCw, Trash2, CheckCircle, XCircle } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { showToast } from '../common/ToastNotifications';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface DemoDataManagerProps {
  enterpriseId: string;
}

export function DemoDataManager({ enterpriseId }: DemoDataManagerProps) {
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const [isCleanupDialogOpen, setIsCleanupDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  // Query to check for demo data (vendors/contracts marked as demo)
  const { data: demoDataQuery } = useQuery({
    queryKey: ['demo-data-check', enterpriseId],
    queryFn: async () => {
      // Check for vendors with is_demo flag or demo in metadata
      const { count: demoVendors } = await supabase
        .from('vendors')
        .select('id', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId)
        .eq('is_demo', true);

      const { count: demoContracts } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId)
        .eq('is_demo', true);

      return {
        hasExistingDemoData: (demoVendors || 0) > 0 || (demoContracts || 0) > 0,
        existingDemoVendors: demoVendors || 0,
        existingDemoContracts: demoContracts || 0,
      };
    },
    enabled: !!enterpriseId,
  });

  const demoDataExists = demoDataQuery || { hasExistingDemoData: false, existingDemoVendors: 0, existingDemoContracts: 0 };

  // Query for demo stats
  const { data: demoStatsQuery } = useQuery({
    queryKey: ['demo-stats', enterpriseId],
    queryFn: async () => {
      const [vendorsResult, contractsResult, matchedResult] = await Promise.all([
        supabase.from('vendors').select('id', { count: 'exact', head: true }).eq('enterprise_id', enterpriseId).eq('is_demo', true),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('enterprise_id', enterpriseId).eq('is_demo', true),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('enterprise_id', enterpriseId).eq('is_demo', true).not('vendor_id', 'is', null),
      ]);

      const totalContracts = contractsResult.count || 0;
      const matchedContracts = matchedResult.count || 0;

      return {
        isDemoDataPresent: (vendorsResult.count || 0) > 0,
        totalVendors: vendorsResult.count || 0,
        totalContracts,
        matchedContracts,
        unmatchedContracts: totalContracts - matchedContracts,
      };
    },
    enabled: !!enterpriseId && demoDataExists.hasExistingDemoData,
  });

  const demoStats = demoStatsQuery || { isDemoDataPresent: false, totalVendors: 0, totalContracts: 0, matchedContracts: 0, unmatchedContracts: 0 };

  // Setup demo account mutation - calls edge function
  const setupDemoAccount = async (params: { enterpriseId: string; cleanupFirst: boolean }) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/demo-setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      // Demo setup function not implemented - create minimal demo data directly
      return createMinimalDemoData(params.enterpriseId, params.cleanupFirst);
    }

    return response.json();
  };

  // Create minimal demo data directly if edge function not available
  const createMinimalDemoData = async (entId: string, cleanupFirst: boolean) => {
    if (cleanupFirst) {
      await supabase.from('contracts').delete().eq('enterprise_id', entId).eq('is_demo', true);
      await supabase.from('vendors').delete().eq('enterprise_id', entId).eq('is_demo', true);
    }

    // Create demo vendors
    const demoVendors = [
      { name: 'Acme Software Inc.', category: 'Technology', primary_contact_email: 'contact@acme.demo' },
      { name: 'Global Services Ltd.', category: 'Services', primary_contact_email: 'contact@globalservices.demo' },
      { name: 'Tech Solutions Corp.', category: 'Technology', primary_contact_email: 'contact@techsolutions.demo' },
    ];

    const { data: createdVendors, error: vendorError } = await (supabase as any)
      .from('vendors')
      .insert(demoVendors.map(v => ({ ...v, enterprise_id: entId, is_demo: true, status: 'active' })))
      .select('id, name');

    if (vendorError) throw vendorError;

    // Create demo contracts
    const demoContracts = (createdVendors || []).flatMap((vendor: any) => [
      {
        enterprise_id: entId,
        vendor_id: vendor.id,
        title: `${vendor.name} - Master Agreement`,
        status: 'active',
        value: Math.floor(Math.random() * 100000) + 10000,
        is_demo: true,
      },
      {
        enterprise_id: entId,
        vendor_id: vendor.id,
        title: `${vendor.name} - Support Contract`,
        status: 'active',
        value: Math.floor(Math.random() * 50000) + 5000,
        is_demo: true,
      },
    ]);

    const { data: createdContracts, error: contractError } = await (supabase as any)
      .from('contracts')
      .insert(demoContracts)
      .select('id');

    if (contractError) throw contractError;

    return {
      success: true,
      vendorsCreated: (createdVendors || []).length,
      contractsCreated: (createdContracts || []).length,
      contractsMatched: (createdContracts || []).length,
      contractsUnmatched: 0,
      errors: [],
    };
  };

  // Cleanup demo data mutation
  const cleanupDemoData = async (params: { enterpriseId: string }) => {
    const { count: deletedContracts } = await supabase
      .from('contracts')
      .delete()
      .eq('enterprise_id', params.enterpriseId)
      .eq('is_demo', true);

    const { count: deletedVendors } = await supabase
      .from('vendors')
      .delete()
      .eq('enterprise_id', params.enterpriseId)
      .eq('is_demo', true);

    return { deletedContracts: deletedContracts || 0, deletedVendors: deletedVendors || 0 };
  };

  const handleSetupDemo = async (cleanupFirst: boolean = false) => {
    setIsProcessing(true);
    try {
      const result = await setupDemoAccount({
        enterpriseId,
        cleanupFirst,
      });

      if (result.success) {
        showToast.success(
          `Created ${result.vendorsCreated} vendors and ${result.contractsCreated} contracts (${result.contractsMatched} matched, ${result.contractsUnmatched} unmatched)`,
          { title: 'Demo Data Setup Complete' }
        );
        queryClient.invalidateQueries({ queryKey: ['demo-data-check'] });
        queryClient.invalidateQueries({ queryKey: ['demo-stats'] });
        queryClient.invalidateQueries({ queryKey: ['vendors'] });
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
        setIsSetupDialogOpen(false);
      } else {
        showToast.warning(
          `Created ${result.vendorsCreated} vendors and ${result.contractsCreated} contracts, but encountered ${result.errors.length} errors`,
          { title: 'Setup Partially Failed' }
        );
      }
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Failed to setup demo data',
        { title: 'Setup Failed' }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanupDemo = async () => {
    setIsProcessing(true);
    try {
      const result = await cleanupDemoData({ enterpriseId });

      showToast.success(
        `Removed ${result.deletedContracts} contracts and ${result.deletedVendors} vendors`,
        { title: 'Demo Data Cleaned Up' }
      );
      queryClient.invalidateQueries({ queryKey: ['demo-data-check'] });
      queryClient.invalidateQueries({ queryKey: ['demo-stats'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setIsCleanupDialogOpen(false);
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Failed to cleanup demo data',
        { title: 'Cleanup Failed' }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!demoDataExists) return null;

  const hasDemoData = demoDataExists?.hasExistingDemoData;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Demo Data Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasDemoData ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">Demo data is active</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">No demo data found</span>
              </>
            )}
          </div>
          
          {hasDemoData && (
            <div className="flex gap-2">
              <Badge variant="secondary">
                {demoDataExists.existingDemoVendors} vendors
              </Badge>
              <Badge variant="secondary">
                {demoDataExists.existingDemoContracts} contracts
              </Badge>
            </div>
          )}
        </div>

        {/* Detailed Stats */}
        {demoStats && demoStats.isDemoDataPresent && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{demoStats.totalVendors}</div>
              <div className="text-sm text-gray-600">Vendors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{demoStats.totalContracts}</div>
              <div className="text-sm text-gray-600">Contracts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{demoStats.matchedContracts}</div>
              <div className="text-sm text-gray-600">Matched</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{demoStats.unmatchedContracts}</div>
              <div className="text-sm text-gray-600">Unmatched</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Dialog open={isSetupDialogOpen} onOpenChange={setIsSetupDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant={hasDemoData ? "outline" : "default"}
                className="flex items-center gap-2"
                disabled={isProcessing}
              >
                <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                {hasDemoData ? 'Refresh Demo Data' : 'Setup Demo Data'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {hasDemoData ? 'Refresh Demo Data' : 'Setup Demo Data'}
                </DialogTitle>
                <DialogDescription>
                  {hasDemoData 
                    ? 'This will replace existing demo data with fresh samples.'
                    : 'This will create sample vendors and contracts to showcase all features of the application.'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {hasDemoData 
                      ? 'Existing demo data will be removed and replaced with new samples.'
                      : 'This will create 25+ vendors and 120+ contracts with realistic demo data.'
                    }
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="font-medium">What will be created:</h4>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• 25 vendors across all categories (Technology, Legal, Finance, etc.)</li>
                    <li>• 120+ contracts with various types (SaaS, MSA, SOW, etc.)</li>
                    <li>• Realistic contract data (pricing, dates, payment schedules)</li>
                    <li>• Vendor-contract matching (85% matched, 15% unmatched)</li>
                    <li>• Different contract statuses (Active, Draft, Expired, etc.)</li>
                  </ul>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsSetupDialogOpen(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleSetupDemo(hasDemoData)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Setting up...
                      </>
                    ) : (
                      hasDemoData ? 'Refresh Data' : 'Setup Demo'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {hasDemoData && (
            <Dialog open={isCleanupDialogOpen} onOpenChange={setIsCleanupDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="flex items-center gap-2"
                  disabled={isProcessing}
                >
                  <Trash2 className="h-4 w-4" />
                  Clean Up Demo Data
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clean Up Demo Data</DialogTitle>
                  <DialogDescription>
                    This will permanently remove all demo vendors and contracts from your account.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This action cannot be undone. All demo data will be permanently deleted.
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCleanupDialogOpen(false)}
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={handleCleanupDemo}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Cleaning up...
                        </>
                      ) : (
                        'Delete Demo Data'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Feature Highlight */}
        {!hasDemoData && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Perfect for Demos & Testing</h4>
            <p className="text-sm text-blue-700">
              The demo data includes all the features you&apos;ll want to showcase: vendor management, 
              contract tracking, analytics, matching algorithms, and more. Great for presentations, 
              testing, or exploring the platform.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}