'use client';

import React, { useState } from 'react';
// import { useQuery, useMutation } from 'convex/react';
// import { api } from '../../../../convex/_generated/api';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { AlertTriangle, Database, RefreshCw, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { showToast } from '../common/ToastNotifications';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Alert, AlertDescription } from '../../../components/ui/alert';

interface DemoDataManagerProps {
  enterpriseId: string;
}

export function DemoDataManager({ enterpriseId }: DemoDataManagerProps) {
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const [isCleanupDialogOpen, setIsCleanupDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Queries
//   const demoDataExists = useQuery(api.features.demo.checkDemoDataExists, enterpriseId ? { enterpriseId } : "skip");
//   const demoStats = useQuery(api.features.demo.getDemoDataStats, enterpriseId ? { enterpriseId } : "skip");

  // Mutations
//   const setupDemoAccount = useMutation(api.features.demo.setupDemoAccount);
//   const cleanupDemoData = useMutation(api.features.demo.cleanupDemoData);

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