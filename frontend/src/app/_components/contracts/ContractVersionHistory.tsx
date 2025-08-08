'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
import { useUser } from '@clerk/nextjs';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons
import {
  Clock,
  Eye,
  Download,
  AlertCircle,
  History,
  ArrowUpDown,
  Diff
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ContractType } from '@/types/contract.types';

interface ContractVersionHistoryProps {
  contractId: Id<"contracts">;
  currentContract?: ContractType;
}

interface VersionDiff {
  field: string;
  label: string;
  oldValue: string | null;
  newValue: string | null;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
}

// Mock version data - in a real app, this would come from the backend
const mockVersionHistory = [
  {
    _id: 'version_1' as Id<"contracts">,
    versionNumber: 3,
    title: 'Updated Software License Agreement',
    createdAt: '2024-01-15T10:30:00Z',
    createdBy: 'John Doe',
    changeType: 'major' as const,
    changeDescription: 'Updated pricing structure and added new service level agreements',
    extractedStartDate: '2024-02-01',
    extractedEndDate: '2025-02-01',
    extractedPricing: '$50,000/year',
    extractedScope: 'Software licensing with premium support and training',
    status: 'active' as const,
  },
  {
    _id: 'version_2' as Id<"contracts">,
    versionNumber: 2,
    title: 'Software License Agreement',
    createdAt: '2023-12-20T14:15:00Z',
    createdBy: 'Jane Smith',
    changeType: 'minor' as const,
    changeDescription: 'Updated contact information and payment terms',
    extractedStartDate: '2024-01-01',
    extractedEndDate: '2025-01-01',
    extractedPricing: '$45,000/year',
    extractedScope: 'Software licensing with standard support',
    status: 'superseded' as const,
  },
  {
    _id: 'version_3' as Id<"contracts">,
    versionNumber: 1,
    title: 'Initial Software License Agreement',
    createdAt: '2023-11-10T09:00:00Z',
    createdBy: 'System',
    changeType: 'initial' as const,
    changeDescription: 'Initial contract version uploaded',
    extractedStartDate: '2023-12-01',
    extractedEndDate: '2024-12-01',
    extractedPricing: '$40,000/year',
    extractedScope: 'Basic software licensing',
    status: 'superseded' as const,
  },
];

const changeTypeColors = {
  initial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300',
  minor: 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300',
  major: 'bg-orange-100 text-orange-800 dark:bg-orange-900/70 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300',
};

const statusColors = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300',
  superseded: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  archived: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

export const ContractVersionHistory: React.FC<ContractVersionHistoryProps> = ({
}) => {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const [selectedVersions, setSelectedVersions] = useState<[number, number]>([3, 2]);
  const [viewMode, setViewMode] = useState<'timeline' | 'compare'>('timeline');

  // Get enterpriseId from Clerk user's metadata
  const enterpriseId = clerkUser?.publicMetadata?.enterpriseId as Id<"enterprises"> | undefined;

  // In a real implementation, you would fetch version history from the backend
  // const { data: versionHistory, isLoading } = useConvexQuery(
  //   api.contracts.getContractVersionHistory,
  //   (contractId && enterpriseId) ? { contractId, enterpriseId } : "skip"
  // );

  // Using mock data for now
  const versionHistory = mockVersionHistory;
  const isLoading = false;

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'PPp');
    } catch (err) {
      return dateString;
    }
  };

  const generateDiff = (oldVersion: typeof mockVersionHistory[0], newVersion: typeof mockVersionHistory[0]): VersionDiff[] => {
    const diffs: VersionDiff[] = [];
    
    const fields = [
      { key: 'title', label: 'Title' },
      { key: 'extractedStartDate', label: 'Start Date' },
      { key: 'extractedEndDate', label: 'End Date' },
      { key: 'extractedPricing', label: 'Pricing' },
      { key: 'extractedScope', label: 'Scope' },
    ];

    fields.forEach(({ key, label }) => {
      const oldValue = oldVersion[key as keyof typeof oldVersion] as string || null;
      const newValue = newVersion[key as keyof typeof newVersion] as string || null;
      
      let type: VersionDiff['type'] = 'unchanged';
      if (oldValue !== newValue) {
        if (!oldValue) type = 'added';
        else if (!newValue) type = 'removed';
        else type = 'modified';
      }
      
      diffs.push({
        field: key,
        label,
        oldValue,
        newValue,
        type,
      });
    });

    return diffs.filter(diff => diff.type !== 'unchanged');
  };

  const selectedVersionData = useMemo(() => {
    const [newer, older] = selectedVersions;
    const newerVersion = versionHistory.find(v => v.versionNumber === newer);
    const olderVersion = versionHistory.find(v => v.versionNumber === older);
    
    if (!newerVersion || !olderVersion) return null;
    
    return {
      newer: newerVersion,
      older: olderVersion,
      diffs: generateDiff(olderVersion, newerVersion),
    };
  }, [selectedVersions, versionHistory]);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Loading version history...</p>
      </div>
    );
  }

  if (!enterpriseId && isClerkLoaded) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>
          Enterprise information is missing for your user account.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border dark:border-border/50 bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl font-medium text-primary dark:text-primary-foreground">
                Version History
              </CardTitle>
              <Badge variant="outline">
                {versionHistory.length} versions
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('timeline')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Timeline
              </Button>
              <Button
                variant={viewMode === 'compare' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('compare')}
              >
                <Diff className="h-4 w-4 mr-2" />
                Compare
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'timeline' | 'compare')}>
        <TabsContent value="timeline" className="space-y-4">
          {/* Timeline View */}
          <div className="space-y-4">
            {versionHistory.map((version, index) => (
              <Card key={version._id} className="border-border dark:border-border/50 bg-card shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                          version.status === 'active' 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        )}>
                          {version.versionNumber}
                        </div>
                        {index < versionHistory.length - 1 && (
                          <div className="w-px h-12 bg-border dark:bg-border/50 mt-2" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-medium text-foreground">
                            {version.title}
                          </h3>
                          <Badge className={statusColors[version.status]}>
                            {version.status}
                          </Badge>
                          <Badge className={changeTypeColors[version.changeType]}>
                            {version.changeType}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          {version.changeDescription}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-foreground">Start Date:</span>
                            <p className="text-muted-foreground">{version.extractedStartDate || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">End Date:</span>
                            <p className="text-muted-foreground">{version.extractedEndDate || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Pricing:</span>
                            <p className="text-muted-foreground">{version.extractedPricing || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Created By:</span>
                            <p className="text-muted-foreground">{version.createdBy}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(version.createdAt)}
                      </p>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          {/* Compare View */}
          <Card className="border-border dark:border-border/50 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Compare Versions</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Version:</label>
                  <select
                    className="px-3 py-1 border rounded-md text-sm"
                    value={selectedVersions[0]}
                    onChange={(e) => setSelectedVersions([parseInt(e.target.value), selectedVersions[1]])}
                  >
                    {versionHistory.map(v => (
                      <option key={v.versionNumber} value={v.versionNumber}>
                        v{v.versionNumber} - {v.title}
                      </option>
                    ))}
                  </select>
                </div>
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Version:</label>
                  <select
                    className="px-3 py-1 border rounded-md text-sm"
                    value={selectedVersions[1]}
                    onChange={(e) => setSelectedVersions([selectedVersions[0], parseInt(e.target.value)])}
                  >
                    {versionHistory.map(v => (
                      <option key={v.versionNumber} value={v.versionNumber}>
                        v{v.versionNumber} - {v.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedVersionData && (
                <div className="space-y-6">
                  {/* Version Headers */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <h3 className="font-medium text-green-800 dark:text-green-300 mb-2">
                        Version {selectedVersionData.newer.versionNumber} (Newer)
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        {formatDate(selectedVersionData.newer.createdAt)}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                        Version {selectedVersionData.older.versionNumber} (Older)
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {formatDate(selectedVersionData.older.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Differences */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Changes</h4>
                    {selectedVersionData.diffs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No differences found between these versions.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedVersionData.diffs.map((diff, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="font-medium text-foreground">{diff.label}</span>
                              <Badge variant="outline" className={cn(
                                diff.type === 'added' && 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300',
                                diff.type === 'removed' && 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300',
                                diff.type === 'modified' && 'bg-orange-100 text-orange-800 dark:bg-orange-900/70 dark:text-orange-300'
                              )}>
                                {diff.type}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                                <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-1">
                                  Version {selectedVersionData.newer.versionNumber}
                                </p>
                                <p className="text-sm text-foreground">
                                  {diff.newValue || <span className="text-muted-foreground italic">None</span>}
                                </p>
                              </div>
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">
                                  Version {selectedVersionData.older.versionNumber}
                                </p>
                                <p className="text-sm text-foreground">
                                  {diff.oldValue || <span className="text-muted-foreground italic">None</span>}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContractVersionHistory;