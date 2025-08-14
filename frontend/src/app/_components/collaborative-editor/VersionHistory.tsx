'use client';

import React, { useState, useMemo } from 'react';
import { format } from '@/lib/date';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';

// Temporary type alias
type Id<T extends string> = string;
import { useAuth } from '@/contexts/AuthContext';

// Types
import {
  DocumentSnapshot,
  VersionDiff,
  TextChange,
  FormatChange,
  ConflictResolution as ConflictResolutionType
} from '@/types/collaborative-editor.types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons
import {
  History,
  GitBranch,
  Clock,
  User,
  Plus,
  Minus,
  Save,
  RotateCcw,
  AlertTriangle,
  Check,
  Eye,
  FileText,
  Diff
} from 'lucide-react';

import { cn } from '@/lib/utils';

// ============================================================================
// VERSION HISTORY PANEL
// ============================================================================

interface VersionHistoryProps {
  documentId: Id<"collaborativeDocuments">;
  className?: string;
  onRestoreVersion?: (version: DocumentSnapshot) => void;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  documentId,
  className,
  onRestoreVersion
}) => {
  const { user, userProfile } = useAuth();
  const userId = user?.id;

  // State
  const [selectedVersions, setSelectedVersions] = useState<[number, number]>([0, 1]);
  const [viewMode, setViewMode] = useState<'timeline' | 'compare'>('timeline');
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<DocumentSnapshot | null>(null);

  // TODO: Replace with Supabase queries
  const snapshots: DocumentSnapshot[] = [];
  const isLoading = false;
  const conflicts: any[] = [];

  // TODO: Replace with Supabase mutations
  const createSnapshot = {
    execute: async (args: any) => {
      console.log('Create snapshot:', args);
      return { success: true };
    }
  };
  const restoreVersion = {
    execute: async (args: any) => {
      console.log('Restore version:', args);
      return { success: true };
    }
  };
  const resolveConflict = {
    execute: async (args: any) => {
      console.log('Resolve conflict:', args);
      return { success: true };
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateSnapshot = async () => {
    if (!userId) return;

    try {
      await createSnapshot.execute({
        documentId,
        description: `Manual snapshot created by ${userProfile?.full_name || user?.email || 'user'}`,
        createdBy: userId
      });
    } catch (error) {
      console.error('Error creating snapshot:', error);
    }
  };

  const handleRestoreVersion = async () => {
    if (!versionToRestore || !userId) return;

    try {
      await restoreVersion.execute({
        documentId,
        targetVersion: versionToRestore.version,
        restoredBy: userId
      });

      onRestoreVersion?.(versionToRestore);
      setIsRestoreDialogOpen(false);
      setVersionToRestore(null);
    } catch (error) {
      console.error('Error restoring version:', error);
    }
  };

  const handleResolveConflict = async (
    conflictId: string,
    resolution: 'accept_local' | 'accept_remote' | 'merge'
  ) => {
    try {
      await resolveConflict.execute({
        conflictId,
        resolution,
        resolvedBy: userId!
      });
    } catch (error) {
      console.error('Error resolving conflict:', error);
    }
  };

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const versionDiff = useMemo(() => {
    if (!snapshots || selectedVersions[0] >= snapshots.length || selectedVersions[1] >= snapshots.length) {
      return null;
    }

    const [newerIndex, olderIndex] = selectedVersions;
    const newerSnapshot = snapshots?.[newerIndex];
    const olderSnapshot = snapshots?.[olderIndex];

    if (!newerSnapshot || !olderSnapshot) return null;

    // Calculate differences
    const addedText: TextChange[] = [];
    const removedText: TextChange[] = [];
    const modifiedFormatting: FormatChange[] = [];

    // Simple text diff calculation (in a real implementation, this would be more sophisticated)
    const newerContent = newerSnapshot.state.content;
    const olderContent = olderSnapshot.state.content;

    if (newerContent.length > olderContent.length) {
      addedText.push({
        position: 0,
        content: newerContent.slice(olderContent.length),
        userId: newerSnapshot.createdBy,
        timestamp: newerSnapshot.createdAt
      });
    } else if (olderContent.length > newerContent.length) {
      removedText.push({
        position: 0,
        content: olderContent.slice(newerContent.length),
        userId: newerSnapshot.createdBy,
        timestamp: newerSnapshot.createdAt
      });
    }

    return {
      operations: [],
      addedText,
      removedText,
      modifiedFormatting,
      fromVersion: olderSnapshot.version,
      toVersion: newerSnapshot.version
    } as VersionDiff;
  }, [selectedVersions, snapshots]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderVersionCard = (snapshot: DocumentSnapshot, index: number) => (
    <Card
      key={snapshot._id}
      className={cn(
        "cursor-pointer transition-colors",
        selectedVersions.includes(index) && "ring-2 ring-primary"
      )}
      onClick={() => {
        if (viewMode === 'compare') {
          const [first, second] = selectedVersions;
          if (index === first || index === second) {
            // Deselect if already selected
            setSelectedVersions([first === index ? second : first, second === index ? first : second]);
          } else {
            // Replace the second selection
            setSelectedVersions([first, index]);
          }
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">v{snapshot.version}</Badge>
              {snapshot.isAutoSnapshot ? (
                <Badge variant="secondary">Auto</Badge>
              ) : (
                <Badge variant="default">Manual</Badge>
              )}
              {index === 0 && (
                <Badge className="bg-green-100 text-green-800">Current</Badge>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium">
                {snapshot.description || `Version ${snapshot.version}`}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <User className="h-3 w-3" />
                <span>{snapshot.createdBy}</span>
                <Clock className="h-3 w-3" />
                <span>{format(new Date(snapshot.createdAt), 'MMM dd, yyyy HH:mm')}</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>{snapshot.state.content.length} characters</p>
              <p>{snapshot.state.operations.length} operations</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setVersionToRestore(snapshot);
                setIsRestoreDialogOpen(true);
              }}
              disabled={index === 0}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDiffViewer = () => {
    if (!versionDiff) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
              Version {versionDiff.toVersion} (Newer)
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {snapshots?.[selectedVersions[0]]?.state.content.slice(0, 200)}...
            </p>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-2">
              Version {versionDiff.fromVersion} (Older)
            </h4>
            <p className="text-sm text-orange-700 dark:text-orange-400">
              {snapshots?.[selectedVersions[1]]?.state.content.slice(0, 200)}...
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Changes</h4>
          
          {versionDiff.addedText.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-green-600 mb-2">Added Text</h5>
              {versionDiff.addedText.map((change, index) => (
                <div key={index} className="p-2 bg-green-50 dark:bg-green-900/20 rounded border-l-4 border-green-400">
                  <p className="text-sm">
                    <Plus className="inline h-3 w-3 mr-1" />
                    {change.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {versionDiff.removedText.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-red-600 mb-2">Removed Text</h5>
              {versionDiff.removedText.map((change, index) => (
                <div key={index} className="p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-4 border-red-400">
                  <p className="text-sm">
                    <Minus className="inline h-3 w-3 mr-1" />
                    {change.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {versionDiff.modifiedFormatting.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-blue-600 mb-2">Format Changes</h5>
              {versionDiff.modifiedFormatting.map((change, index) => (
                <div key={index} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-l-4 border-blue-400">
                  <p className="text-sm">
                    <FileText className="inline h-3 w-3 mr-1" />
                    Format changed at position {change.position}
                  </p>
                </div>
              ))}
            </div>
          )}

          {versionDiff.addedText.length === 0 && 
           versionDiff.removedText.length === 0 && 
           versionDiff.modifiedFormatting.length === 0 && (
            <p className="text-sm text-muted-foreground">No differences found between these versions.</p>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3">Loading version history...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-primary" />
              <CardTitle>Version History</CardTitle>
              <Badge variant="outline">
                {snapshots?.length || 0} versions
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
              <Button onClick={handleCreateSnapshot}>
                <Save className="h-4 w-4 mr-2" />
                Create Snapshot
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Conflicts Alert */}
      {conflicts && conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Active Conflicts ({conflicts?.length || 0})</AlertTitle>
          <AlertDescription>
            There are unresolved conflicts that need attention.
            <div className="mt-2 space-y-2">
              {conflicts?.slice(0, 3).map((conflict, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-destructive/10 rounded">
                  <span className="text-sm">Conflict at position {(conflict as { id: string; position: number }).position}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveConflict((conflict as { id: string; position: number }).id, 'accept_local')}
                    >
                      Accept Local
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveConflict((conflict as { id: string; position: number }).id, 'accept_remote')}
                    >
                      Accept Remote
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Content */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'timeline' | 'compare')}>
        <TabsContent value="timeline">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {snapshots?.map((snapshot, index) => renderVersionCard(snapshot, index))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="compare">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Versions to Compare</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto">
                  {snapshots?.map((snapshot, index) => renderVersionCard(snapshot, index))}
                </div>
              </CardContent>
            </Card>

            {selectedVersions[0] !== selectedVersions[1] && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Comparing v{snapshots?.[selectedVersions[0]]?.version} → v{snapshots?.[selectedVersions[1]]?.version}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderDiffViewer()}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Restore Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version</DialogTitle>
          </DialogHeader>
          
          {versionToRestore && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will restore the document to version {versionToRestore.version}. 
                  Any changes made after this version will be lost. A new snapshot will be created before restoring.
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Version {versionToRestore.version}</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Created by {versionToRestore.createdBy} on {format(new Date(versionToRestore.createdAt), 'PPp')}
                </p>
                <p className="text-sm">{versionToRestore.description}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestoreVersion} className="bg-destructive text-destructive-foreground">
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// CONFLICT RESOLUTION COMPONENT
// ============================================================================

interface ConflictResolutionProps {
  conflicts: ConflictResolutionType[];
  onResolveConflict: (conflictId: string, resolution: 'accept_local' | 'accept_remote' | 'merge') => void;
}

export const ConflictResolution: React.FC<ConflictResolutionProps> = ({
  conflicts,
  onResolveConflict
}) => {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Conflicts Detected ({conflicts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {conflicts.map((conflict, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Conflict {index + 1}</h4>
                <Badge variant="destructive">{conflict.strategy}</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                    Local Change
                  </h5>
                  <p className="text-sm">
                    {conflict.winningOperation.type} operation
                  </p>
                </div>
                
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                  <h5 className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-2">
                    Remote Change
                  </h5>
                  <p className="text-sm">
                    {conflict.losingOperation.type} operation
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onResolveConflict(`conflict-${index}`, 'accept_local')}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept Local
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResolveConflict(`conflict-${index}`, 'accept_remote')}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept Remote
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResolveConflict(`conflict-${index}`, 'merge')}
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  Merge
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default VersionHistory;