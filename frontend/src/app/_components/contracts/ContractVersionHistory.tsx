'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { format } from '@/lib/date';

// UI Components

// Icons
import { AlertCircle, History, Clock, Download, Eye, ArrowUpDown, GitCompare } from 'lucide-react';
// Alias GitCompare as Diff for semantic clarity
const Diff = GitCompare;

import { cn } from '@/lib/utils';
import type { ContractType } from '@/types/contract.types';
import type { Id } from '@/types/id.types';

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

interface ContractVersion {
  _id: Id<"contracts">;
  versionNumber: number;
  title: string;
  createdAt: string;
  createdBy: string;
  changeType: 'initial' | 'minor' | 'major' | 'critical';
  changeDescription: string;
  extractedStartDate: string | null;
  extractedEndDate: string | null;
  extractedPricing: string | null;
  extractedScope: string | null;
  status: 'active' | 'superseded' | 'archived';
}

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
  contractId,
}) => {
  const { user, userProfile, isLoading: authLoading } = useAuth();
  const [selectedVersions, setSelectedVersions] = useState<[number, number]>([2, 1]);
  const [viewMode, setViewMode] = useState<'timeline' | 'compare'>('timeline');
  const [versionHistory, setVersionHistory] = useState<ContractVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);

  // Get enterpriseId from user profile
  const enterpriseId = userProfile?.enterprise_id as Id<"enterprises"> | undefined;

  // Fetch version history from Supabase
  useEffect(() => {
    const fetchVersionHistory = async () => {
      if (!contractId || !enterpriseId) {
        setIsLoadingVersions(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await (supabase as any)
          .from('contract_versions')
          .select(`
            id,
            version_number,
            title,
            created_at,
            created_by,
            change_type,
            change_description,
            extracted_start_date,
            extracted_end_date,
            extracted_pricing,
            extracted_scope,
            status,
            users:created_by (first_name, last_name)
          `)
          .eq('contract_id', contractId)
          .order('version_number', { ascending: false });

        if (error) {
          console.error('Error fetching contract versions:', error);
          setVersionHistory([]);
        } else {
          const mappedVersions: ContractVersion[] = (data || []).map((v: any) => ({
            _id: v.id as Id<"contracts">,
            versionNumber: v.version_number || 1,
            title: v.title || 'Untitled Version',
            createdAt: v.created_at,
            createdBy: v.users
              ? `${v.users.first_name || ''} ${v.users.last_name || ''}`.trim() || 'Unknown'
              : 'System',
            changeType: v.change_type || 'minor',
            changeDescription: v.change_description || 'No description provided',
            extractedStartDate: v.extracted_start_date,
            extractedEndDate: v.extracted_end_date,
            extractedPricing: v.extracted_pricing,
            extractedScope: v.extracted_scope,
            status: v.status || 'superseded',
          }));
          setVersionHistory(mappedVersions);

          // Set default selected versions if we have at least 2 versions
          if (mappedVersions.length >= 2) {
            setSelectedVersions([
              mappedVersions[0].versionNumber,
              mappedVersions[1].versionNumber
            ]);
          } else if (mappedVersions.length === 1) {
            setSelectedVersions([mappedVersions[0].versionNumber, mappedVersions[0].versionNumber]);
          }
        }
      } catch (error) {
        console.error('Error fetching contract versions:', error);
        setVersionHistory([]);
      } finally {
        setIsLoadingVersions(false);
      }
    };

    fetchVersionHistory();
  }, [contractId, enterpriseId]);

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'PPp');
    } catch (err) {
      return dateString;
    }
  };

  const generateDiff = (oldVersion: ContractVersion, newVersion: ContractVersion): VersionDiff[] => {
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

  if (authLoading || isLoadingVersions) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Loading version history...</p>
      </div>
    );
  }

  if (!enterpriseId) {
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
