'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Check, 
  X, 
  Trash2, 
  Archive, 
  Edit, 
  Download, 
  Mail, 
  Tag, 
  Copy, 
  MoreHorizontal,
  CheckSquare,
  Square,
  MinusSquare,
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { showToast } from './ToastNotifications';

// Generic type for items that can be bulk selected
export interface BulkActionItem {
  id: string;
  title?: string;
  status?: string;
  type?: string;
  [key: string]: unknown;
}

// Bulk action definition
export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  disabled?: boolean;
  hidden?: boolean;
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationMessage?: string;
  maxItems?: number;
  minItems?: number;
  allowedStatuses?: string[];
  allowedTypes?: string[];
  handler: (selectedItems: BulkActionItem[]) => Promise<void> | void;
}

// Bulk operation result
export interface BulkOperationResult {
  success: number;
  failed: number;
  total: number;
  errors?: string[];
}

// Selection state hook
export const useBulkSelection = <T extends BulkActionItem>(items: T[]) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedItems = useMemo(() => {
    return items.filter(item => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const isAllSelected = useMemo(() => {
    return items.length > 0 && items.every(item => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const isPartiallySelected = useMemo(() => {
    return selectedIds.size > 0 && !isAllSelected;
  }, [selectedIds.size, isAllSelected]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  }, [items, isAllSelected]);

  const selectItems = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectByCondition = useCallback((condition: (item: T) => boolean) => {
    const matchingIds = items.filter(condition).map(item => item.id);
    setSelectedIds(new Set(matchingIds));
  }, [items]);

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    toggleItem,
    toggleAll,
    selectItems,
    clearSelection,
    selectByCondition,
  };
};

// Bulk action bar component
export interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  selectedItems: BulkActionItem[];
  onClearSelection: () => void;
  className?: string;
  variant?: 'fixed' | 'inline' | 'floating';
  position?: 'top' | 'bottom';
  showProgress?: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  totalCount,
  actions,
  selectedItems,
  onClearSelection,
  className,
  variant = 'fixed',
  position = 'bottom',
  showProgress = true
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

  // Filter actions based on selection
  const availableActions = useMemo(() => {
    return actions.filter(action => {
      if (action.hidden) return false;
      if (action.disabled) return false;
      if (action.maxItems && selectedCount > action.maxItems) return false;
      if (action.minItems && selectedCount < action.minItems) return false;
      
      // Check status constraints
      if (action.allowedStatuses) {
        const hasValidStatus = selectedItems.some(item => 
          action.allowedStatuses!.includes(item.status || '')
        );
        if (!hasValidStatus) return false;
      }

      // Check type constraints
      if (action.allowedTypes) {
        const hasValidType = selectedItems.some(item => 
          action.allowedTypes!.includes(item.type || '')
        );
        if (!hasValidType) return false;
      }

      return true;
    });
  }, [actions, selectedCount, selectedItems]);

  const handleAction = async (action: BulkAction) => {
    if (action.requiresConfirmation) {
      setConfirmAction(action);
      return;
    }

    await executeAction(action);
  };

  const executeAction = async (action: BulkAction) => {
    setIsProcessing(true);
    setProgress(0);
    setCurrentOperation(action.label);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      await action.handler(selectedItems);

      clearInterval(progressInterval);
      setProgress(100);

      showToast.success(`${action.label} completed`, {
        description: `Successfully processed ${selectedCount} items.`
      });

      onClearSelection();
    } catch (error) {
      console.error('Bulk action failed:', error);
      showToast.error(`${action.label} failed`, {
        description: error instanceof Error ? error.message : 'An unexpected error occurred.'
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setCurrentOperation('');
      setConfirmAction(null);
    }
  };

  const handleConfirm = async () => {
    if (confirmAction) {
      await executeAction(confirmAction);
    }
  };

  const containerClasses = cn(
    'bg-background border shadow-lg rounded-lg p-4 transition-all duration-200',
    variant === 'fixed' && 'fixed left-4 right-4 z-50',
    variant === 'fixed' && position === 'bottom' && 'bottom-4',
    variant === 'fixed' && position === 'top' && 'top-4',
    variant === 'floating' && 'fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50',
    variant === 'inline' && 'relative',
    className
  );

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <Card className={containerClasses}>
        <CardContent className="p-0">
          {/* Progress bar during processing */}
          {isProcessing && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{currentOperation}...</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex items-center justify-between">
            {/* Selection info */}
            <div className="flex items-center gap-3">
              <Badge variant="default" className="flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                {selectedCount} selected
              </Badge>
              
              {showProgress && totalCount > 0 && (
                <span className="text-sm text-muted-foreground">
                  {Math.round((selectedCount / totalCount) * 100)}% of {totalCount}
                </span>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                disabled={isProcessing}
                className="h-7 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {availableActions.slice(0, 3).map(action => {
                const IconComponent = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant={action.variant || 'outline'}
                    size="sm"
                    onClick={() => handleAction(action)}
                    disabled={isProcessing}
                    className="flex items-center gap-1"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      IconComponent && <IconComponent className="h-3 w-3" />
                    )}
                    <span className="hidden sm:inline">{action.label}</span>
                  </Button>
                );
              })}

              {/* More actions dropdown */}
              {availableActions.length > 3 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isProcessing}>
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableActions.slice(3).map(action => {
                      const IconComponent = action.icon;
                      return (
                        <DropdownMenuItem
                          key={action.id}
                          onClick={() => handleAction(action)}
                          className={cn(
                            action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                          )}
                        >
                          {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
                          {action.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              {confirmAction?.confirmationTitle || `Confirm ${confirmAction?.label}`}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.confirmationMessage || 
                `Are you sure you want to ${confirmAction?.label.toLowerCase()} ${selectedCount} items? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will affect {selectedCount} selected items.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction?.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Confirm {confirmAction?.label}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Select all header component
export interface SelectAllHeaderProps {
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onToggleAll: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const SelectAllHeader: React.FC<SelectAllHeaderProps> = ({
  isAllSelected,
  isPartiallySelected,
  onToggleAll,
  disabled = false,
  label = "Select all",
  className
}) => {
  const getIcon = () => {
    if (isAllSelected) return CheckSquare;
    if (isPartiallySelected) return MinusSquare;
    return Square;
  };

  const IconComponent = getIcon();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Checkbox
        checked={isAllSelected}
        ref={(el: HTMLButtonElement | null) => {
          if (el && (el as HTMLInputElement & { indeterminate?: boolean }).indeterminate !== undefined) {
            (el as HTMLInputElement & { indeterminate?: boolean }).indeterminate = isPartiallySelected;
          }
        }}
        onCheckedChange={onToggleAll}
        disabled={disabled}
        aria-label={label}
      />
      <span className="text-sm text-muted-foreground hidden sm:inline">
        {label}
      </span>
    </div>
  );
};

// Item selection checkbox component
export interface SelectItemCheckboxProps {
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  item?: BulkActionItem;
  className?: string;
}

export const SelectItemCheckbox: React.FC<SelectItemCheckboxProps> = ({
  isSelected,
  onToggle,
  disabled = false,
  item,
  className
}) => {
  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={onToggle}
      disabled={disabled}
      className={className}
      aria-label={`Select ${item?.title || 'item'}`}
    />
  );
};

// Predefined bulk actions for common operations
export const createCommonBulkActions = (
  entityType: 'contracts' | 'vendors',
  handlers: {
    onDelete?: (items: BulkActionItem[]) => Promise<void>;
    onArchive?: (items: BulkActionItem[]) => Promise<void>;
    onExport?: (items: BulkActionItem[]) => Promise<void>;
    onUpdateStatus?: (items: BulkActionItem[], status: string) => Promise<void>;
    onAssignTag?: (items: BulkActionItem[], tag: string) => Promise<void>;
    onDuplicate?: (items: BulkActionItem[]) => Promise<void>;
  }
): BulkAction[] => {
  const actions: BulkAction[] = [];

  if (handlers.onExport) {
    actions.push({
      id: 'export',
      label: 'Export',
      icon: Download,
      variant: 'outline',
      handler: handlers.onExport,
    });
  }

  if (handlers.onDuplicate) {
    actions.push({
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      variant: 'outline',
      maxItems: 10, // Limit duplications
      handler: handlers.onDuplicate,
    });
  }

  if (handlers.onAssignTag) {
    actions.push({
      id: 'tag',
      label: 'Add Tag',
      icon: Tag,
      variant: 'outline',
      handler: (items) => handlers.onAssignTag!(items, 'important'), // Could open a tag selector
    });
  }

  if (handlers.onArchive) {
    actions.push({
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      variant: 'outline',
      requiresConfirmation: true,
      confirmationTitle: `Archive ${entityType}`,
      confirmationMessage: `Are you sure you want to archive these ${entityType}? They will be moved to the archive and won't appear in the main list.`,
      handler: handlers.onArchive,
    });
  }

  if (handlers.onDelete) {
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      requiresConfirmation: true,
      confirmationTitle: `Delete ${entityType}`,
      confirmationMessage: `Are you sure you want to permanently delete these ${entityType}? This action cannot be undone.`,
      handler: handlers.onDelete,
    });
  }

  return actions;
};

export default BulkActionBar;