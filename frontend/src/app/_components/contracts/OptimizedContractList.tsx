'use client';

import React, { useState, useMemo, useCallback, memo } from 'react';
import { useContracts, useContractMutations } from '@/hooks/useContracts';
import { Tables } from '@/types/database.types';
import {
  FileText,
  Search,
  Download,
  Trash2,
  UserPlus,
  MoreVertical,
  Loader2,
  ChevronDown,
  RefreshCw,
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
import { useVirtualScroll, lazyWithRetry } from '@/lib/performance';
import { useKeyboardNavigation, SkipLinks } from '@/lib/accessibility';
import { useBreakpoint, useSwipeGesture, ResponsiveTable, touchTargetSizes } from '@/lib/mobile';
// import { useOptimisticMutation, useInfiniteQuery, useCachedQuery } from '@/lib/convex-helpers';
import { useAIService } from '@/lib/ai-service-helpers';

// Lazy load heavy components
const ExportDialog = lazyWithRetry(() => import('./ExportDialog'));
const BulkAssignDialog = lazyWithRetry(() => import('./BulkAssignDialog'));

// Types
type Contract = Tables<'contracts'> & {
  vendors?: Tables<'vendors'>;
  departments?: Tables<'departments'>;
  contract_documents?: Tables<'contract_documents'>[];
};

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
  onToggle: (id: string) => void;
  onView: (id: string) => void;
  isFocused: boolean;
  isMobile: boolean;
}) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onView(contract.id);
    }
  }, [contract.id, onView]);

  if (isMobile) {
    return (
      <Card 
        className={cn(
          "p-4 mb-3 cursor-pointer transition-all",
          touchTargetSizes.md,
          isFocused && "ring-2 ring-primary",
          isSelected && "bg-muted/50"
        )}
        onClick={() => onView(contract.id)}
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
              onCheckedChange={() => onToggle(contract.id)}
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
                {contract.contract_type && (
                  <span>{contract.contract_type}</span>
                )}
                {contract.total_value && (
                  <span>${contract.total_value.toLocaleString()}</span>
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
      onClick={() => onView(contract.id)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="row"
      aria-selected={isSelected}
    >
      <td className="pl-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(contract.id)}
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
      <td>{contract.contract_type || '-'}</td>
      <td>{contract.total_value ? `$${contract.total_value.toLocaleString()}` : '-'}</td>
      <td>{contract.end_date ? new Date(contract.end_date).toLocaleDateString() : '-'}</td>
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
            <DropdownMenuItem onClick={() => onView(contract.id)}>
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
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Contract['status'] | undefined>();
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { isMobile } = useBreakpoint();
  
  // Use Supabase hooks for data fetching with real-time updates
  const { contracts, isLoading, error, refetch, isSubscribed } = useContracts({
    status: statusFilter,
    orderBy: 'created_at',
    ascending: false,
    realtime: true // Enable real-time updates
  });

  // Use Supabase mutations
  const { deleteContract, isLoading: isDeleting } = useContractMutations();

  // Filter contracts based on search
  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    if (!debouncedSearch) return contracts;
    
    return contracts.filter(contract => 
      contract.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      contract.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      contract.vendors?.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [contracts, debouncedSearch]);

  // Virtual scrolling for large lists
  const itemHeight = isMobile ? 100 : 60;
  const containerHeight = 600;
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  } = useVirtualScroll(
    filteredContracts || [],
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
          window.location.href = `/dashboard/contracts/${contract.id}`;
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
    if (!filteredContracts) return { total: 0, active: 0, expiring: 0 };
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return {
      total: filteredContracts.length,
      active: filteredContracts.filter(c => c.status === 'active').length,
      expiring: filteredContracts.filter(c => {
        if (!c.end_date) return false;
        const endDate = new Date(c.end_date);
        return endDate >= now && endDate <= thirtyDaysFromNow;
      }).length,
    };
  }, [filteredContracts]);

  // Handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked && filteredContracts) {
      setSelectedContracts(new Set(filteredContracts.map(c => c.id)));
    } else {
      setSelectedContracts(new Set());
    }
  }, [filteredContracts]);

  const handleToggleContract = useCallback((id: string) => {
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
      const promises = Array.from(selectedContracts).map(id => 
        deleteContract(id, {
          onSuccess: () => console.log(`Deleted contract ${id}`),
          onError: (error) => console.error(`Failed to delete contract ${id}:`, error)
        })
      );
      await Promise.all(promises);
      setSelectedContracts(new Set());
    }
  }, [selectedContracts, deleteContract]);

  // Loading state
  if (isLoading && !filteredContracts) {
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
        {/* Real-time indicator */}
        {isSubscribed && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <div className="h-2 w-2 bg-green-600 rounded-full animate-pulse" />
            Real-time updates active
          </div>
        )}
        
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
              onClick={() => refetch()}
              title="Refresh contracts"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
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
          {filteredContracts?.map((contract, index) => (
            <ContractRow
              key={contract.id}
              contract={contract}
              isSelected={selectedContracts.has(contract.id)}
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
                      checked={filteredContracts?.length > 0 && selectedContracts.size === filteredContracts.length}
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
                    key={contract.id}
                    contract={contract}
                    isSelected={selectedContracts.has(contract.id)}
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
      {filteredContracts?.length === 0 && (
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