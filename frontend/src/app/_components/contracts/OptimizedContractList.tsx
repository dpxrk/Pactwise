'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
// import { useQuery, useMutation } from 'convex/react';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  FileText,
  Search,
  Filter,
  Download,
  Trash2,
  UserPlus,
  MoreVertical,
  AlertCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

// Performance utilities
import { useVirtualScroll, useOptimisticUpdate, lazyWithRetry } from '@/lib/performance';
import { useKeyboardNavigation, useFocusTrap, ariaLabels, SkipLinks } from '@/lib/accessibility';
import { useBreakpoint, useSwipeGesture, ResponsiveTable, touchTargetSizes } from '@/lib/mobile';
// import { useOptimisticMutation, useInfiniteQuery, useCachedQuery } from '@/lib/convex-helpers';
import { useAIService } from '@/lib/ai-service-helpers';

// Lazy load heavy components
const DataTable = lazyWithRetry(() => import('@/components/ui/data-table'));
const ExportDialog = lazyWithRetry(() => import('./ExportDialog'));
const BulkAssignDialog = lazyWithRetry(() => import('./BulkAssignDialog'));

// Types
interface Contract {
  _id: Id<"contracts">;
  title: string;
  status: string;
  vendorId?: Id<"vendors">;
  value?: number;
  startDate?: string;
  endDate?: string;
  contractType?: string;
  analysisStatus?: string;
}

// Memoized components
const ContractRow = memo(({ 
  contract, 
  isSelected, 
  onToggle, 
  onView,
  isFocused,
  isMobile 
}: {
  contract: Contract;
  isSelected: boolean;
  onToggle: (id: Id<"contracts">) => void;
  onView: (id: Id<"contracts">) => void;
  isFocused: boolean;
  isMobile: boolean;
}) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onView(contract._id);
    }
  }, [contract._id, onView]);

  if (isMobile) {
    return (
      <Card 
        className={cn(
          "p-4 mb-3 cursor-pointer transition-all",
          touchTargetSizes.md,
          isFocused && "ring-2 ring-primary",
          isSelected && "bg-muted/50"
        )}
        onClick={() => onView(contract._id)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Contract: ${contract.title}`}
        aria-pressed={isSelected}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggle(contract._id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${contract.title}`}
              className={touchTargetSizes.sm}
            />
            <div className="flex-1 space-y-1">
              <h3 className="font-medium text-sm line-clamp-2">{contract.title}</h3>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant={getStatusVariant(contract.status)} className="text-xs">
                  {contract.status}
                </Badge>
                {contract.contractType && (
                  <span>{contract.contractType}</span>
                )}
                {contract.value && (
                  <span>${contract.value.toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <tr 
      className={cn(
        "hover:bg-muted/50 cursor-pointer transition-colors",
        isFocused && "ring-2 ring-primary ring-inset",
        isSelected && "bg-muted/50"
      )}
      onClick={() => onView(contract._id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="row"
      aria-selected={isSelected}
    >
      <td className="pl-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(contract._id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${contract.title}`}
        />
      </td>
      <td className="py-4">
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">{contract.title}</span>
        </div>
      </td>
      <td>
        <Badge variant={getStatusVariant(contract.status)}>
          {contract.status}
        </Badge>
      </td>
      <td>{contract.contractType || '-'}</td>
      <td>{contract.value ? `$${contract.value.toLocaleString()}` : '-'}</td>
      <td>{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : '-'}</td>
      <td>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              aria-label={`Actions for ${contract.title}`}
              className={touchTargetSizes.sm}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(contract._id)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});

ContractRow.displayName = 'ContractRow';

// Main component
export default function OptimizedContractList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContracts, setSelectedContracts] = useState<Set<Id<"contracts">>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  
  // Cached query with stale-while-revalidate
  const { data: contracts, isLoading } = useCachedQuery<Contract[]>(
    api.contracts.list,
    { 
      enterpriseId: 'dummy-enterprise-id' as Id<"enterprises">,
      searchQuery: debouncedSearch 
    },
    {
      cacheKey: `contracts-${debouncedSearch}`,
      cacheTTL: 300, // 5 minutes
      staleWhileRevalidate: true,
    }
  );

  // Optimistic mutations
  const { execute: deleteContracts } = useOptimisticMutation(
    api.contracts.bulkDelete,
    {
      optimisticUpdate: (args) => {
        // Optimistically remove from UI
        setSelectedContracts(new Set());
      },
      rollback: () => {
        // Restore selection on error
      },
    }
  );

  // AI service for bulk analysis
  const { execute: analyzeContracts, progress: analysisProgress } = useAIService(
    api.contracts.bulkAnalyze,
    {
      onProgress: (progress) => {
        console.log(`Analysis progress: ${progress}%`);
      },
    }
  );

  // Virtual scrolling for large lists
  const itemHeight = isMobile ? 100 : 60;
  const containerHeight = 600;
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  } = useVirtualScroll(
    contracts || [],
    itemHeight,
    containerHeight
  );

  // Keyboard navigation
  const { focusedIndex, setFocusedIndex } = useKeyboardNavigation(
    visibleItems,
    {
      onSelect: (index) => {
        const contract = visibleItems[index];
        if (contract) {
          window.location.href = `/dashboard/contracts/${contract._id}`;
        }
      },
      onEscape: () => setFocusedIndex(-1),
    }
  );

  // Swipe gestures for mobile
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => {
      // Show actions menu
    },
    onSwipeRight: () => {
      // Toggle selection
    },
  });

  // Memoized calculations
  const stats = useMemo(() => {
    if (!contracts) return { total: 0, active: 0, expiring: 0 };
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return {
      total: contracts.length,
      active: contracts.filter(c => c.status === 'active').length,
      expiring: contracts.filter(c => {
        if (!c.endDate) return false;
        const endDate = new Date(c.endDate);
        return endDate >= now && endDate <= thirtyDaysFromNow;
      }).length,
    };
  }, [contracts]);

  // Handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked && contracts) {
      setSelectedContracts(new Set(contracts.map(c => c._id)));
    } else {
      setSelectedContracts(new Set());
    }
  }, [contracts]);

  const handleToggleContract = useCallback((id: Id<"contracts">) => {
    setSelectedContracts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedContracts.size === 0) return;
    
    if (confirm(`Delete ${selectedContracts.size} contracts?`)) {
      await deleteContracts({ contractIds: Array.from(selectedContracts) });
    }
  }, [selectedContracts, deleteContracts]);

  const handleBulkAnalyze = useCallback(async () => {
    if (selectedContracts.size === 0) return;
    
    await analyzeContracts({ contractIds: Array.from(selectedContracts) });
  }, [selectedContracts, analyzeContracts]);

  // Loading state
  if (isLoading && !contracts) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading contracts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SkipLinks />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="region" aria-label="Contract statistics">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total Contracts</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-muted-foreground">Active</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.expiring}</div>
          <div className="text-sm text-muted-foreground">Expiring Soon</div>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" 
            aria-hidden="true"
          />
          <Input
            id="search"
            type="search"
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search contracts"
            autoComplete="off"
          />
        </div>
        
        {selectedContracts.size > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowExportDialog(true)}
              aria-label={`Export ${selectedContracts.size} selected contracts`}
            >
              <Download className="h-4 w-4 mr-2" />
              Export ({selectedContracts.size})
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAssignDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBulkAnalyze}
              disabled={analysisProgress > 0 && analysisProgress < 100}
            >
              {analysisProgress > 0 && analysisProgress < 100 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {Math.round(analysisProgress)}%
                </>
              ) : (
                <>
                  <FileSearch className="h-4 w-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Contracts List */}
      {isMobile ? (
        <div 
          className="space-y-2"
          {...swipeHandlers}
          role="list"
          aria-label="Contracts list"
        >
          {contracts?.map((contract, index) => (
            <ContractRow
              key={contract._id}
              contract={contract}
              isSelected={selectedContracts.has(contract._id)}
              onToggle={handleToggleContract}
              onView={(id) => window.location.href = `/dashboard/contracts/${id}`}
              isFocused={focusedIndex === index}
              isMobile={true}
            />
          ))}
        </div>
      ) : (
        <ResponsiveTable>
          <div 
            className="overflow-auto relative"
            onScroll={handleScroll}
            style={{ height: containerHeight }}
            role="region"
            aria-label="Contracts table"
          >
            <table className="w-full">
              <thead className="sticky top-0 bg-background z-10">
                <tr role="row">
                  <th className="pl-4">
                    <Checkbox
                      checked={contracts?.length > 0 && selectedContracts.size === contracts.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all contracts"
                    />
                  </th>
                  <th className="text-left py-3" role="columnheader">
                    <Button variant="ghost" size="sm" className="h-auto p-0">
                      Title
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </th>
                  <th className="text-left" role="columnheader">Status</th>
                  <th className="text-left" role="columnheader">Type</th>
                  <th className="text-left" role="columnheader">Value</th>
                  <th className="text-left" role="columnheader">End Date</th>
                  <th className="text-left" role="columnheader">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody style={{ height: totalHeight }}>
                <tr style={{ height: offsetY }} aria-hidden="true" />
                {visibleItems.map((contract, index) => (
                  <ContractRow
                    key={contract._id}
                    contract={contract}
                    isSelected={selectedContracts.has(contract._id)}
                    onToggle={handleToggleContract}
                    onView={(id) => window.location.href = `/dashboard/contracts/${id}`}
                    isFocused={focusedIndex === index}
                    isMobile={false}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </ResponsiveTable>
      )}

      {/* Empty State */}
      {contracts?.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No contracts found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'Try adjusting your search criteria' : 'Get started by creating your first contract'}
          </p>
          {!searchQuery && (
            <Button>Create Contract</Button>
          )}
        </Card>
      )}

      {/* Lazy-loaded Dialogs */}
      {showExportDialog && (
        <React.Suspense fallback={<Loader2 className="animate-spin" />}>
          <ExportDialog
            contractIds={Array.from(selectedContracts)}
            onClose={() => setShowExportDialog(false)}
          />
        </React.Suspense>
      )}

      {showAssignDialog && (
        <React.Suspense fallback={<Loader2 className="animate-spin" />}>
          <BulkAssignDialog
            contractIds={Array.from(selectedContracts)}
            onClose={() => setShowAssignDialog(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
}

// Helper functions
function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'active': return 'default';
    case 'draft': return 'secondary';
    case 'expired': return 'destructive';
    default: return 'outline';
  }
}